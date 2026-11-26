/**
 * Docker simulado para os testes do motor python-completo: registra cada `docker run` e cada
 * comando curto, e deixa o teste decidir como o "contêiner" se comporta (fica pronto, responde
 * às sondas, trava, morre...). Nenhum processo real é criado.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { DockerClient, DockerProcess, DockerResult } from "../src/docker-cli"
import { NATIVE_READY_MARKER, type NativeEngineOptions } from "../src/native-engine"

const testDir = path.dirname(fileURLToPath(import.meta.url))

/** O lote como o contêiner o recebe pela entrada padrão. */
export interface ReceivedBatch {
  header: { files: { path: string; content: string }[]; harness: string }
  job: { nonce: string; entry: string; strict: boolean; probes: { id: string; kind: string }[] }
}

/** Um `docker run` simulado. */
export class FakeContainer implements DockerProcess {
  stdin = ""
  isKilled = false
  hasExited = false
  readonly exited: Promise<number | null>
  private resolveExit: (code: number | null) => void = () => undefined
  private readonly stdoutListeners: ((chunk: Buffer) => void)[] = []
  private readonly stderrListeners: ((chunk: Buffer) => void)[] = []
  /** Chamado quando o motor fecha a entrada padrão (o lote chegou inteiro). */
  onBatch: (batch: ReceivedBatch) => void = () => undefined

  constructor(readonly args: readonly string[]) {
    this.exited = new Promise((resolve) => {
      this.resolveExit = resolve
    })
  }

  /** Nome dado ao contêiner em `--name`. */
  get name(): string {
    return this.args[this.args.indexOf("--name") + 1] ?? ""
  }

  write(data: string): void {
    this.stdin += data
  }

  end(): void {
    this.onBatch(this.received())
  }

  onStdout(listener: (chunk: Buffer) => void): void {
    this.stdoutListeners.push(listener)
  }

  onStderr(listener: (chunk: Buffer) => void): void {
    this.stderrListeners.push(listener)
  }

  kill(): void {
    this.isKilled = true
    this.exit(null)
  }

  /** O contêiner escreve na saída padrão. */
  print(text: string | Buffer): void {
    for (const listener of this.stdoutListeners) listener(Buffer.isBuffer(text) ? text : Buffer.from(text, "utf8"))
  }

  /** O contêiner (ou o `docker`) escreve na saída de erro. */
  complain(text: string): void {
    for (const listener of this.stderrListeners) listener(Buffer.from(text, "utf8"))
  }

  /** O contêiner avisa que está pronto. */
  becomeReady(): void {
    this.print(`${NATIVE_READY_MARKER}\n`)
  }

  /** O processo `docker run` termina. */
  exit(code: number | null): void {
    if (this.hasExited) return
    this.hasExited = true
    this.resolveExit(code)
  }

  /** Separa o que chegou pela entrada padrão: `<n>\n`, n bytes de cabeçalho e o JSON das sondas. */
  received(): ReceivedBatch {
    const raw = Buffer.from(this.stdin, "utf8")
    const lineEnd = raw.indexOf("\n")
    const length = Number(raw.subarray(0, lineEnd).toString("ascii"))
    const header = JSON.parse(raw.subarray(lineEnd + 1, lineEnd + 1 + length).toString("utf8")) as ReceivedBatch["header"]
    const job = JSON.parse(raw.subarray(lineEnd + 1 + length).toString("utf8")) as ReceivedBatch["job"]
    return { header, job }
  }

  /** Responde ok a cada sonda (com `stdout`) e termina com código 0, como o harness faria. */
  answer(batch: ReceivedBatch, stdout = "levelusp-autoteste 3.14.10\n"): void {
    for (const probe of batch.job.probes) this.print(`${batch.job.nonce} ${JSON.stringify({ id: probe.id, ok: true, stdout })}\n`)
    this.exit(0)
  }
}

/** Como um contêiner recém-criado se comporta; o padrão fica pronto e responde ao lote. */
export type ContainerBehavior = (container: FakeContainer) => void

/** Contêiner obediente: pronto logo depois de criado, responde ok a todas as sondas. */
export const obedient: ContainerBehavior = (container) => {
  container.onBatch = (batch) => container.answer(batch)
  queueMicrotask(() => container.becomeReady())
}

/** Cliente do Docker simulado. */
export class FakeDocker implements DockerClient {
  readonly containers: FakeContainer[] = []
  readonly commands: string[][] = []
  /** Comportamento dos próximos contêineres; cada `docker run` consome um item (o último se repete). */
  behaviors: ContainerBehavior[] = [obedient]
  /** Saída do `docker info` (runtimes, um por linha). */
  runtimes = ["runc", "runsc"]
  /** Nomes devolvidos por `docker ps` além dos contêineres vivos (contêineres órfãos). */
  orphans: string[] = []
  infoCode: number | null = 0
  /** Runtime que o `docker inspect` informa; ausente = o pedido em `--runtime=` (Docker honesto). */
  reportedRuntime: string | undefined
  /** Quantos `docker rm` de UM contêiner ainda vão falhar (daemon ocupado) antes de funcionar. */
  failingRemovals = 0

  spawn(args: readonly string[]): DockerProcess {
    const container = new FakeContainer(args)
    this.containers.push(container)
    const behavior = this.behaviors.length > 1 ? this.behaviors.shift() : this.behaviors[0]
    behavior?.(container)
    return container
  }

  exec(args: readonly string[]): Promise<DockerResult> {
    this.commands.push([...args])
    if (args[0] === "info") return Promise.resolve({ code: this.infoCode, stdout: this.runtimes.join("\n") + "\n", stderr: this.infoCode === 0 ? "" : "Cannot connect to the Docker daemon" })
    if (args[0] === "ps") {
      const alive = this.containers.filter((container) => !container.hasExited).map((container) => container.name)
      return Promise.resolve({ code: 0, stdout: [...alive, ...this.orphans].join("\n"), stderr: "" })
    }
    if (args[0] === "inspect") {
      const container = this.containers.find((candidate) => candidate.name === args[args.length - 1])
      const requested = container?.args.find((arg) => arg.startsWith("--runtime="))?.slice("--runtime=".length) ?? ""
      return Promise.resolve({ code: container ? 0 : 1, stdout: `${this.reportedRuntime ?? requested}\n`, stderr: "" })
    }
    if (args[0] === "rm") {
      if (args.length === 3 && this.failingRemovals > 0) {
        this.failingRemovals--
        return Promise.resolve({ code: 1, stdout: "", stderr: "Error response from daemon: removal of container is already in progress" })
      }
      this.orphans = this.orphans.filter((name) => !args.includes(name))
      // `docker rm -f` mata o contêiner: o `docker run` dele termina.
      for (const container of this.containers) if (args.includes(container.name)) container.exit(137)
    }
    return Promise.resolve({ code: 0, stdout: "", stderr: "" })
  }

  /** Comandos `docker rm --force` emitidos, pelos nomes dos alvos. */
  removed(): string[] {
    return this.commands.filter((command) => command[0] === "rm").flatMap((command) => command.slice(2))
  }
}

/** Opções do motor para os testes (harness e bootstrap reais; o resto pequeno). */
export const engineOptions = (docker: DockerClient, overrides: Partial<NativeEngineOptions> = {}): NativeEngineOptions => ({
  docker,
  image: "levelusp/python-completo:teste",
  runtime: "runsc",
  insecure: false,
  harnessPath: path.resolve(testDir, "../python/harness.py"),
  bootstrapPath: path.resolve(testDir, "../python/native_bootstrap.py"),
  warm: 1,
  memoryMb: 512,
  cpus: 1,
  pidsLimit: 64,
  workDiskMb: 32,
  bootTimeoutMs: 1_000,
  preload: ["numpy"],
  ...overrides,
})

/** Espera as microtarefas e os temporizadores zerados pendentes (reposição do pool, saída de processos). */
export const settle = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 5))
