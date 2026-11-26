import { randomBytes } from "node:crypto"
import { readFile } from "node:fs/promises"
import { DEFAULT_RUNNER_LIMITS, findManifestLibrary, listManifestLibrariesFor, runtimeSupportsProbe, type ProbeKind, type ProbeObservation } from "@levelusp/contracts"
import type { DockerClient, DockerProcess } from "./docker-cli.js"
import { EngineRequestError, RuntimeUnavailableError, type Engine, type EngineBatch, type EngineCost, type EngineReadiness, type EngineRequest, type EngineStats, type EngineVersions } from "./engine.js"
import type { Logger } from "./logger.js"
import type { NativeRuntime } from "./native-policy.js"
import { collectObservations, parseObservations, prepareGuestJob } from "./observations.js"

/** Runtime de lição que este motor atende. */
const NATIVE_RUNTIME = "python-completo"
/** Rótulo de todo contêiner do motor: é por ele que os órfãos de uma execução anterior são removidos na partida. */
export const NATIVE_CONTAINER_LABEL = "levelusp.engine=python-completo"
/** Linha que o `native_bootstrap.py` escreve quando o contêiner está pronto para receber o lote. */
export const NATIVE_READY_MARKER = "LVL-CONTEINER-PRONTO"
/** Usuário sem privilégio dentro do contêiner (`nobody`), por número: não depende do `/etc/passwd` da imagem. */
const UNPRIVILEGED_USER = "65534:65534"
/** tmpfs de `/tmp` (MB): caches de bibliotecas; o projeto fica em `/work`. */
const TMP_TMPFS_MB = 16
/** `/dev/shm` (MB): o padrão do Docker são 64 MB graváveis fora do projeto. */
const SHM_MB = 8
/** Descritores de arquivo abertos por processo. */
const MAX_OPEN_FILES = 256
/** Teto da saída padrão do contêiner (observações + prints diretos no descritor 1), como no motor WASI. */
const MAX_STDOUT_BYTES = 8 * 1024 * 1024
const MAX_STDERR_CHARS = 256 * 1024
/** Quanto do stderr do contêiner vai para o log quando o lote não produz observação. */
const LOGGED_STDERR_CHARS = 2_000
/** Código de saída de um processo morto com SIGKILL (o que o cgroup faz ao estourar a memória). */
const SIGKILL_EXIT_CODE = 137
/** Duração assumida de um lote com contêiner pronto, antes da primeira medição. */
const INITIAL_BATCH_MS = 500
/** Duração assumida da partida de um contêiner antes da primeira medição (gVisor + importações). */
const INITIAL_BOOT_MS = 3_000
/** Peso da medição mais recente na média móvel da partida. */
const BOOT_ESTIMATE_WEIGHT = 0.3
/** Espera antes de repor um contêiner do pool que morreu ocioso (evita laço de partidas falhando). */
const REFILL_RETRY_MS = 5_000
/** Mortes seguidas de contêineres ociosos depois das quais o pool para de se repor sozinho. */
const MAX_IDLE_DEATHS = 3
/** Tentativas de `docker rm --force` de um contêiner antes de deixá-lo para a varredura de órfãos. */
const REMOVE_ATTEMPTS = 3
/** Espera entre as tentativas de remoção. */
const DEFAULT_REMOVE_RETRY_MS = 1_000
/** Intervalo da varredura de contêineres do motor que não pertencem a nenhum lote vivo. */
const DEFAULT_ORPHAN_SWEEP_MS = 60_000
/** O Docker responde assim quando o contêiner já não existe (o `--rm` chegou antes): conta como removido. */
const ALREADY_REMOVED = /no such container/i
/** Nome de módulo Python aceito em `preload` (vai para o argv do contêiner). */
const MODULE_NAME = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/

/** O que define o isolamento e os limites de um contêiner do motor. */
export interface NativeContainerSpec {
  /** Nome único do contêiner (para `docker rm -f`). */
  name: string
  image: string
  runtime: NativeRuntime
  /** Teto de memória (MB), sem swap além dele. */
  memoryMb: number
  /** CPUs (pode ser fração). */
  cpus: number
  /** Processos e threads simultâneos. */
  pidsLimit: number
  /** Tamanho do tmpfs do projeto em `/work` (MB). */
  workDiskMb: number
  /** Teto de tempo de CPU por processo (s): rede de segurança se o executor morrer com o lote rodando. */
  cpuSeconds: number
  /** Código de `native_bootstrap.py`, passado em `python -c`. */
  bootstrap: string
  /** Módulos importados antes do lote. */
  preload: readonly string[]
}

/**
 * Argumentos de `docker run` de um contêiner do motor. Cada item é uma barreira:
 * runtime gVisor, sem rede, raiz somente leitura com dois tmpfs pequenos (`noexec`), usuário
 * sem privilégio, nenhuma capability, `no-new-privileges`, CPU, memória (sem swap), processos,
 * descritores e tempo de CPU limitados, sem log em disco e sem baixar imagem. O contêiner não
 * recebe volume, socket nem variável do executor: só as que fixam uma thread por biblioteca.
 */
export function buildDockerRunArgs(spec: NativeContainerSpec): string[] {
  const tmpfs = (target: string, megabytes: number): string => `${target}:rw,noexec,nosuid,nodev,size=${megabytes}m,mode=1777`
  return [
    "run", "--rm", "--interactive", "--pull=never",
    "--name", spec.name,
    "--label", NATIVE_CONTAINER_LABEL,
    `--runtime=${spec.runtime}`,
    "--network=none",
    "--read-only",
    "--tmpfs", tmpfs("/work", spec.workDiskMb),
    "--tmpfs", tmpfs("/tmp", TMP_TMPFS_MB),
    `--shm-size=${SHM_MB}m`,
    "--user", UNPRIVILEGED_USER,
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    `--cpus=${spec.cpus}`,
    `--memory=${spec.memoryMb}m`,
    `--memory-swap=${spec.memoryMb}m`,
    `--pids-limit=${spec.pidsLimit}`,
    "--ulimit", `cpu=${spec.cpuSeconds}`,
    "--ulimit", "core=0",
    "--ulimit", `nofile=${MAX_OPEN_FILES}:${MAX_OPEN_FILES}`,
    "--log-driver=none",
    "--hostname", "sandbox",
    "--workdir", "/work",
    "--env", "HOME=/tmp",
    "--env", "OMP_NUM_THREADS=1",
    "--env", "OPENBLAS_NUM_THREADS=1",
    "--env", "MKL_NUM_THREADS=1",
    "--entrypoint", "python3",
    spec.image,
    // -I: isolado (ignora PYTHON* e o diretório atual); -B: não grava .pyc. Sem -S: o site-packages da imagem é necessário.
    "-I", "-B", "-c", spec.bootstrap, NATIVE_READY_MARKER, ...spec.preload,
  ]
}

/** Configuração do motor `python-completo`. */
export interface NativeEngineOptions {
  docker: DockerClient
  /** Imagem com o Python e as bibliotecas (`infra/docker/python-completo.Dockerfile`); nunca é baixada pelo motor. */
  image: string
  /** Runtime decidido na partida por `decideNativeRuntime`. */
  runtime: NativeRuntime
  /** `true` só no modo de desenvolvimento com `runc` (aparece nas versões, nos contadores e no log). */
  insecure: boolean
  harnessPath: string
  bootstrapPath: string
  /** Contêineres prontos esperando um lote. */
  warm: number
  memoryMb: number
  cpus: number
  pidsLimit: number
  workDiskMb: number
  /** Prazo para um contêiner novo ficar pronto. */
  bootTimeoutMs: number
  /** Módulos importados no aquecimento (os que a imagem não tiver são ignorados). */
  preload: readonly string[]
  /** Peso de um lote no orçamento de memória do executor (MB). Padrão 0: os contêineres são irmãos, fora do cgroup do executor. */
  budgetMemoryMb?: number
  /** Espera entre as tentativas de `docker rm --force` (padrão 1 s). */
  removeRetryMs?: number
  /** Intervalo da varredura de órfãos (padrão 60 s). */
  orphanSweepMs?: number
  log?: Logger
}

/** O que um contêiner precisa do motor que o criou. */
interface ContainerHooks {
  bootTimeoutMs: number
  removeRetryMs: number
  /** Todas as tentativas de remoção falharam: o contêiner pode ter ficado vivo (a varredura tenta de novo). */
  onRemoveFailure: (name: string, stderr: string) => void
}

/** Como um contêiner terminou um lote. */
interface ContainerRun {
  stdout: string
  stderr: string
  timedOut: boolean
  overflowed: boolean
  exitCode: number | null
}

/**
 * Um contêiner de uso único: sobe, avisa que está pronto, recebe um lote, termina. `ready`
 * rejeita se ele morrer ou passar do prazo antes do marcador.
 */
class NativeContainer {
  readonly ready: Promise<void>
  /** Já foi entregue a um lote (deixa de contar como ocioso). */
  isClaimed = false
  isReady = false
  hasExited = false
  exitCode: number | null = null
  private readonly stdoutChunks: Buffer[] = []
  private stdoutBytes = 0
  private stderr = ""
  private isOverflowed = false
  private isDestroyed = false
  private head = ""

  constructor(
    readonly name: string,
    private readonly process: DockerProcess,
    private readonly docker: DockerClient,
    private readonly hooks: ContainerHooks,
  ) {
    const { bootTimeoutMs } = hooks
    this.ready = new Promise<void>((resolve, reject) => {
      const bootTimer = setTimeout(() => {
        reject(new Error("o contêiner não ficou pronto no prazo"))
        this.destroy()
      }, bootTimeoutMs)
      process.onStdout((chunk) => {
        if (this.isReady) return this.collect(chunk)
        this.head += chunk.toString("latin1")
        const lineEnd = this.head.indexOf("\n")
        if (lineEnd < 0) return undefined
        clearTimeout(bootTimer)
        if (this.head.slice(0, lineEnd).trim() !== NATIVE_READY_MARKER) {
          reject(new Error("o contêiner escreveu algo antes de ficar pronto"))
          return this.destroy()
        }
        this.isReady = true
        const rest = Buffer.from(this.head.slice(lineEnd + 1), "latin1")
        this.head = ""
        if (rest.length > 0) this.collect(rest)
        return resolve()
      })
      process.onStderr((chunk) => {
        if (this.stderr.length < MAX_STDERR_CHARS) this.stderr += chunk.toString("utf8")
      })
      void process.exited.then((code) => {
        clearTimeout(bootTimer)
        this.hasExited = true
        this.exitCode = code
        reject(new Error(`o contêiner terminou antes de ficar pronto: ${this.stderr.slice(0, LOGGED_STDERR_CHARS).trim() || `código ${String(code)}`}`))
      })
    })
    // Quem espera `ready` trata a falha; um contêiner ocioso que morre não pode virar rejeição solta.
    this.ready.catch(() => undefined)
  }

  /** Resolve quando o processo `docker run` termina. */
  get exited(): Promise<number | null> {
    return this.process.exited
  }

  private collect(chunk: Buffer): void {
    this.stdoutBytes += chunk.length
    if (this.stdoutBytes > MAX_STDOUT_BYTES) {
      // Inundação de saída: corta e mata o contêiner.
      this.isOverflowed = true
      this.destroy()
      return
    }
    this.stdoutChunks.push(chunk)
  }

  /**
   * Entrega o lote (cabeçalho com arquivos + harness, depois o JSON das sondas), fecha a
   * entrada e espera o fim; passado `timeoutMs`, mata o contêiner.
   */
  async run(header: string, guestJob: string, timeoutMs: number): Promise<ContainerRun> {
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      this.destroy()
    }, timeoutMs)
    this.process.write(`${Buffer.byteLength(header, "utf8")}\n${header}${guestJob}`)
    this.process.end()
    const exitCode = await this.process.exited
    clearTimeout(timer)
    return { stdout: Buffer.concat(this.stdoutChunks).toString("utf8"), stderr: this.stderr, timedOut, overflowed: this.isOverflowed, exitCode }
  }

  /**
   * Mata o contêiner (`docker rm --force`, conferido e repetido se falhar) e o `docker run`
   * local. Pode ser chamado mais de uma vez; depois de um fim normal não faz nada (o `--rm` do
   * Docker já apagou o contêiner).
   */
  destroy(): void {
    if (this.hasExited || this.isDestroyed) return
    this.isDestroyed = true
    void this.remove(1)
    this.process.kill()
  }

  /**
   * Matar o `docker run` local NÃO garante a morte do contêiner: só o `rm --force` aceito pelo
   * daemon garante. Falhou (daemon ocupado, remoção em andamento...) → tenta de novo; esgotadas
   * as tentativas, avisa o motor, e a varredura periódica de órfãos continua tentando.
   */
  private async remove(attempt: number): Promise<void> {
    const result = await this.docker.exec(["rm", "--force", this.name])
    if (result.code === 0 || ALREADY_REMOVED.test(result.stderr)) return
    if (attempt >= REMOVE_ATTEMPTS) {
      this.hooks.onRemoveFailure(this.name, result.stderr)
      return
    }
    setTimeout(() => void this.remove(attempt + 1), this.hooks.removeRetryMs).unref()
  }
}

/**
 * Motor `python-completo`: CPython nativo (com numpy, pandas, scikit-learn e PyTorch) num
 * contêiner Docker de uso único por lote, isolado pelo gVisor ({@link buildDockerRunArgs}).
 *
 * Mesmo protocolo dos outros motores: o lote (nonce + sondas com ids posicionais) entra pela
 * entrada padrão e as observações voltam pela saída padrão, prefixadas pelo nonce; nenhuma
 * sonda carrega o valor esperado, então o gabarito nunca entra no contêiner. Os arquivos do
 * aluno e o `harness.py` também entram pela entrada padrão (o `native_bootstrap.py` os grava
 * no tmpfs): o contêiner não monta nada da máquina.
 *
 * Pool aquecido: `warm` contêineres ficam prontos (interpretador no ar, bibliotecas
 * importadas) esperando um lote; cada um atende um lote só e é reposto depois. Sem contêiner
 * pronto, o lote sobe o próprio e paga a partida.
 *
 * Limites: tempo de parede do lote (`limits.timeoutMs`, com `docker rm -f` ao vencer), saída
 * (8 MB), e os do contêiner (CPU, memória, processos, disco do tmpfs). `limits.memoryMb` do
 * job não se aplica: o teto é o do contêiner (`memoryMb`), fixado na criação.
 *
 * Sem modo estrito: aqui o aluno roda código nativo (`ctypes`) e alcança os frames do harness,
 * então o motor RECUSA sondas `unittest` e `legacy` (`accept` e, de novo, `run`). As demais
 * sondas só levam entradas (argumentos, stdin, a expressão a avaliar): o aluno que as lê não
 * aprende o valor esperado, que fica na API — a mesma garantia das instâncias compartilhadas
 * dos outros motores.
 */
export class NativeEngine implements Engine {
  readonly name = "nativo"
  readonly versions: EngineVersions
  readonly readiness: EngineReadiness = { ready: false, reason: "autoteste pendente" }
  private readonly counters = { batches: 0, timedOut: 0, overflowed: 0, outOfMemory: 0, withoutObservations: 0, launched: 0, bootFailures: 0, idleDeaths: 0, removeFailures: 0, orphansRemoved: 0 }
  private readonly idle: NativeContainer[] = []
  private readonly live = new Set<NativeContainer>()
  private harnessSource = ""
  private bootstrapSource = ""
  private bootEstimateMs = INITIAL_BOOT_MS
  private consecutiveIdleDeaths = 0
  private refillTimer: NodeJS.Timeout | undefined
  private sweepTimer: NodeJS.Timeout | undefined
  /** Motivo pelo qual o motor se recusa a rodar qualquer lote (runtime efetivo diferente do exigido). */
  private blockedReason: string | undefined
  private isClosed = false
  /** O pool só é mantido depois do autoteste aprovado. */
  private isPoolEnabled = false

  /**
   * Monta o motor já com o runtime decidido; nada é criado no Docker antes de `start`.
   *
   * @throws Error quando `preload` tem algo que não é nome de módulo Python.
   */
  constructor(private readonly options: NativeEngineOptions) {
    const invalid = options.preload.filter((name) => !MODULE_NAME.test(name))
    if (invalid.length > 0) throw new Error(`Módulo inválido no pré-carregamento do motor python-completo: ${invalid.join(", ")}`)
    this.versions = { python: "3.14 (nativo)", runtime: options.insecure ? `docker ${options.runtime} (INSEGURO: só desenvolvimento)` : `gVisor (${options.runtime})` }
  }

  /**
   * Só aceita bibliotecas que o manifesto libera para o `python-completo` (as mesmas que a
   * imagem instala) e só sondas não estritas.
   *
   * @throws RuntimeUnavailableError (501) quando o autoteste viu um contêiner fora do runtime exigido.
   * @throws EngineRequestError (`strict_unsupported`) para job com sonda `unittest` ou `legacy`;
   *         (`unknown_library`) para biblioteca fora do manifesto do motor.
   */
  accept(request: EngineRequest): void {
    if (this.blockedReason !== undefined) throw new RuntimeUnavailableError(NATIVE_RUNTIME)
    assertNoStrictProbes(request.probeKinds ?? [])
    const unknown = request.libraries.filter((library) => findManifestLibrary(library)?.engines.includes(NATIVE_RUNTIME) !== true)
    if (unknown.length === 0) return
    const available = listManifestLibrariesFor(NATIVE_RUNTIME).map((entry) => entry.name).join(", ")
    throw new EngineRequestError(`Biblioteca não disponível no motor python-completo: "${unknown.join('", "')}" (disponíveis: ${available})`, "unknown_library")
  }

  /** Classe única (`nativo`); a duração inicial já inclui a partida quando não há contêiner pronto. */
  cost(): EngineCost {
    return { key: "nativo", memoryMb: this.options.budgetMemoryMb ?? 0, initialBatchMs: INITIAL_BATCH_MS + this.warmupMs() }
  }

  /** 0 com contêiner pronto no pool; senão a partida estimada de um contêiner. */
  warmupMs(): number {
    return this.idle.some((container) => container.isReady) ? 0 : Math.round(this.bootEstimateMs)
  }

  stats(): EngineStats {
    return { ...this.counters, warm: this.options.warm, idle: this.idle.length, ready: this.idle.filter((container) => container.isReady).length, runtime: this.options.runtime, insecure: this.options.insecure ? 1 : 0 }
  }

  /**
   * Partida: remove contêineres órfãos de uma execução anterior, confere o runtime EFETIVO de
   * um contêiner criado (`docker inspect`), roda nele o autoteste (um lote trivial pelo caminho
   * real, que também lê a versão do Python da imagem) e enche o pool.
   *
   * Em falha, `readiness.ready` fica falso com o motivo e o pool não é criado; o motor é
   * opcional, então `/healthz` continua 200. Se o runtime efetivo não for o exigido (o Docker
   * aceitou `--runtime=runsc` mas criou o contêiner com outro), o motor falha fechado: passa a
   * recusar todo job (501) até reiniciar.
   */
  async start(): Promise<void> {
    try {
      this.harnessSource = await readFile(this.options.harnessPath, "utf8")
      this.bootstrapSource = await readFile(this.options.bootstrapPath, "utf8")
      await this.sweepOrphans()
      const container = await this.acquire()
      await this.assertEffectiveRuntime(container)
      const [observation] = await this.runIn(container, {
        files: [{ path: "main.py", content: 'import platform\nprint("levelusp-autoteste", platform.python_version())\n' }],
        entry: "main.py",
        probes: [{ kind: "run", id: "autoteste", stdin: "" }],
        limits: { ...DEFAULT_RUNNER_LIMITS },
        libraries: [],
      })
      const version = /levelusp-autoteste (\d+\.\d+\.\d+)/.exec(observation?.stdout ?? "")?.[1]
      this.readiness.ready = observation?.ok === true && version !== undefined
      this.readiness.reason = this.readiness.ready ? "" : (observation?.error ?? "sem observação")
      if (version !== undefined) this.versions.python = `${version} (nativo)`
    } catch (error) {
      this.readiness.ready = false
      this.readiness.reason = error instanceof Error ? error.message : String(error)
    }
    this.isPoolEnabled = this.readiness.ready
    this.refill()
    if (this.readiness.ready && !this.isClosed) {
      this.sweepTimer = setInterval(() => void this.sweepOrphans(), this.options.orphanSweepMs ?? DEFAULT_ORPHAN_SWEEP_MS)
      this.sweepTimer.unref()
    }
  }

  /**
   * Confere no Docker com que runtime o contêiner foi criado de fato.
   *
   * @throws Error (e bloqueia o motor) quando não é o runtime decidido na partida.
   */
  private async assertEffectiveRuntime(container: NativeContainer): Promise<void> {
    const inspected = await this.options.docker.exec(["inspect", "--format", "{{.HostConfig.Runtime}}", container.name])
    const effective = inspected.code === 0 ? inspected.stdout.trim() : ""
    if (effective === this.options.runtime) return
    container.destroy()
    this.blockedReason = `o contêiner do autoteste subiu com o runtime "${effective || "desconhecido"}" e não com "${this.options.runtime}"`
    this.options.log?.("error", "motor python-completo BLOQUEADO: runtime efetivo do contêiner diferente do exigido", { expected: this.options.runtime, effective, stderr: inspected.stderr.slice(0, LOGGED_STDERR_CHARS) })
    throw new Error(this.blockedReason)
  }

  /** Encerra o motor: mata os contêineres vivos (ociosos e em uso) e para de repor o pool. */
  async shutdown(): Promise<void> {
    this.isClosed = true
    clearTimeout(this.refillTimer)
    clearInterval(this.sweepTimer)
    const containers = [...this.live]
    this.idle.length = 0
    for (const container of containers) container.destroy()
    await Promise.all(containers.map((container) => container.exited))
  }

  /**
   * Roda o lote num contêiner novo (ou do pool).
   *
   * @throws EngineRequestError (`strict_unsupported`) para lote com sonda `unittest` ou `legacy`:
   *         segunda barreira, para quem chama o motor sem passar por `accept`.
   * @throws Error quando o motor está bloqueado ou nenhum contêiner fica pronto.
   */
  async run(batch: EngineBatch): Promise<ProbeObservation[]> {
    assertNoStrictProbes(batch.probes.map((probe) => probe.kind))
    if (this.blockedReason !== undefined) throw new Error(`Motor python-completo bloqueado: ${this.blockedReason}`)
    return this.runIn(await this.acquire(), batch)
  }

  private async runIn(container: NativeContainer, batch: EngineBatch): Promise<ProbeObservation[]> {
    try {
      const guestJob = prepareGuestJob(batch.probes, batch.entry)
      const header = JSON.stringify({ files: batch.files, harness: this.harnessSource })
      const outcome = await container.run(header, JSON.stringify(guestJob), batch.limits.timeoutMs)
      const isOutOfMemory = outcome.exitCode === SIGKILL_EXIT_CODE && !outcome.timedOut && !outcome.overflowed
      this.counters.batches++
      if (outcome.timedOut) this.counters.timedOut++
      if (outcome.overflowed) this.counters.overflowed++
      if (isOutOfMemory) this.counters.outOfMemory++
      const observed = parseObservations(outcome.stdout, guestJob.nonce)
      if (observed.size === 0 && batch.probes.length > 0) {
        this.counters.withoutObservations++
        this.options.log?.("error", "contêiner python-completo terminou sem nenhuma observação", {
          stderr: outcome.stderr.slice(0, LOGGED_STDERR_CHARS), timedOut: outcome.timedOut, overflowed: outcome.overflowed, exitCode: outcome.exitCode,
        })
      }
      // O texto de `stderr` só classifica a mensagem (nunca chega cru ao aluno).
      return collectObservations(batch.probes, observed, { timedOut: outcome.timedOut, overflowed: outcome.overflowed, diskExceeded: false, stderr: isOutOfMemory ? "out of memory" : outcome.stderr })
    } finally {
      container.destroy()
      this.consecutiveIdleDeaths = 0
      this.refill()
    }
  }

  /** Entrega um contêiner pronto: o primeiro do pool ou, sem pool, um novo; uma partida que falha é tentada mais uma vez. */
  private async acquire(): Promise<NativeContainer> {
    const first = this.idle.shift() ?? this.launch()
    first.isClaimed = true
    try {
      await first.ready
      return first
    } catch {
      this.counters.bootFailures++
      first.destroy()
      const second = this.launch()
      second.isClaimed = true
      try {
        await second.ready
        return second
      } catch (error) {
        this.counters.bootFailures++
        second.destroy()
        throw error
      }
    }
  }

  private launch(): NativeContainer {
    const { options } = this
    const name = `lvl-completo-${randomBytes(8).toString("hex")}`
    const startedAt = performance.now()
    const args = buildDockerRunArgs({
      name,
      image: options.image,
      runtime: options.runtime,
      memoryMb: options.memoryMb,
      cpus: options.cpus,
      pidsLimit: options.pidsLimit,
      workDiskMb: options.workDiskMb,
      cpuSeconds: cpuSecondsBudget(options.cpus),
      bootstrap: this.bootstrapSource,
      preload: options.preload,
    })
    const container = new NativeContainer(name, options.docker.spawn(args), options.docker, {
      bootTimeoutMs: options.bootTimeoutMs,
      removeRetryMs: options.removeRetryMs ?? DEFAULT_REMOVE_RETRY_MS,
      onRemoveFailure: (failed, stderr) => {
        this.counters.removeFailures++
        options.log?.("error", "não foi possível remover um contêiner do motor python-completo; a varredura de órfãos vai tentar de novo", { name: failed, stderr: stderr.slice(0, LOGGED_STDERR_CHARS) })
      },
    })
    this.counters.launched++
    this.live.add(container)
    void container.ready.then(
      () => {
        this.bootEstimateMs += BOOT_ESTIMATE_WEIGHT * (performance.now() - startedAt - this.bootEstimateMs)
      },
      () => undefined,
    )
    void container.exited.then(() => {
      this.live.delete(container)
      if (container.isClaimed) return
      // Morreu ocioso (imagem ausente, Docker reiniciado...): sai do pool e a reposição espera.
      const index = this.idle.indexOf(container)
      if (index >= 0) this.idle.splice(index, 1)
      this.counters.idleDeaths++
      this.consecutiveIdleDeaths++
      this.scheduleRefill()
    })
    return container
  }

  /** Completa o pool até `warm` contêineres ociosos. */
  private refill(): void {
    while (this.isPoolEnabled && !this.isClosed && this.idle.length < this.options.warm) this.idle.push(this.launch())
  }

  private scheduleRefill(): void {
    if (this.isClosed || this.refillTimer !== undefined) return
    if (this.consecutiveIdleDeaths >= MAX_IDLE_DEATHS) {
      this.options.log?.("error", "contêineres ociosos do motor python-completo estão morrendo: o pool só volta a ser reposto depois do próximo lote", { deaths: this.consecutiveIdleDeaths })
      return
    }
    this.refillTimer = setTimeout(() => {
      this.refillTimer = undefined
      this.refill()
    }, REFILL_RETRY_MS)
    this.refillTimer.unref()
  }

  /**
   * Remove os contêineres com o rótulo do motor que não pertencem a nenhum lote nem ao pool
   * deste processo: sobras de uma execução anterior (na partida) ou de um `docker rm` que falhou
   * (a cada `orphanSweepMs`). Pressupõe UM executor por daemon do Docker.
   *
   * @returns quantos contêineres mandou remover.
   */
  async sweepOrphans(): Promise<number> {
    const listed = await this.options.docker.exec(["ps", "--all", "--filter", `label=${NATIVE_CONTAINER_LABEL}`, "--format", "{{.Names}}"])
    if (listed.code !== 0) return 0
    const owned = new Set([...this.live].map((container) => container.name))
    const orphans = listed.stdout.split(/\s+/).filter((name) => name !== "" && !owned.has(name))
    if (orphans.length === 0) return 0
    const removed = await this.options.docker.exec(["rm", "--force", ...orphans])
    if (removed.code === 0) this.counters.orphansRemoved += orphans.length
    this.options.log?.("warn", "contêineres órfãos do motor python-completo", { count: orphans.length, removed: removed.code === 0 })
    return orphans.length
  }
}

/**
 * Recusa sondas estritas: o motor não tem modo estrito (ver `RUNTIMES_WITHOUT_STRICT_MODE`).
 *
 * @throws EngineRequestError (`strict_unsupported`) se algum tipo for `unittest` ou `legacy`.
 */
function assertNoStrictProbes(kinds: readonly ProbeKind[]): void {
  const refused = [...new Set(kinds.filter((kind) => !runtimeSupportsProbe(NATIVE_RUNTIME, kind)))]
  if (refused.length === 0) return
  throw new EngineRequestError(`O motor python-completo não aceita sondas ${refused.join(" e ")}: ele não tem modo estrito`, "strict_unsupported")
}

/** Maior tempo de parede de um lote aceito pelo contrato (`runnerJobSchema`), em segundos. */
const MAX_BATCH_SECONDS = 30
/** Folga do teto de CPU para a partida e as importações do aquecimento (s). */
const BOOT_CPU_SECONDS = 30

/** Teto de tempo de CPU por processo do contêiner: o maior lote possível em todas as CPUs, mais a partida. */
export function cpuSecondsBudget(cpus: number): number {
  return Math.ceil(MAX_BATCH_SECONDS * Math.max(1, cpus)) + BOOT_CPU_SECONDS
}
