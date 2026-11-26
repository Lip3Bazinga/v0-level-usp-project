import { describe, expect, it } from "vitest"
import type { Probe } from "@levelusp/contracts"
import { loadConfig } from "../src/config"
import { dockerEnvironment } from "../src/docker-cli"
import { EngineRequestError, RuntimeUnavailableError, type EngineBatch } from "../src/engine"
import { Executor } from "../src/executor"
import type { LogLevel } from "../src/logger"
import { buildDockerRunArgs, cpuSecondsBudget, NATIVE_CONTAINER_LABEL, NATIVE_READY_MARKER, NativeEngine, type NativeContainerSpec } from "../src/native-engine"
import { decideNativeRuntime, parseDockerRuntimes } from "../src/native-policy"
import { createNativeEngine } from "../src/native-setup"
import { Semaphore } from "../src/semaphore"
import { buildServer } from "../src/server"
import { engineOptions, FakeDocker, obedient, settle, type ContainerBehavior } from "./native-support"

const SPEC: NativeContainerSpec = {
  name: "lvl-completo-teste", image: "levelusp/python-completo:teste", runtime: "runsc", memoryMb: 1024, cpus: 1, pidsLimit: 64, workDiskMb: 32,
  cpuSeconds: 60, bootstrap: "print('partida')", preload: ["numpy", "pandas"],
}
const BASE_ENV = { PYTHON_WASI_DIR: "/opt/levelusp-python", WASMTIME_BIN: "/usr/bin/true", RUNNER_TOKEN: "levelusp-dev-runner-token-0123456789" }
const runProbe = (id: string): Probe => ({ id, kind: "run", stdin: "" })
const batch = (probes: Probe[], timeoutMs = 2_000): EngineBatch => ({
  files: [{ path: "main.py", content: "print('oi')\n" }, { path: "pacote/util.py", content: "X = 1\n" }],
  entry: "main.py", probes, limits: { timeoutMs, memoryMb: 128 }, libraries: [],
})
/** Contêiner que fica pronto mas nunca responde (laço infinito do aluno). */
const stuck: ContainerBehavior = (container) => queueMicrotask(() => container.becomeReady())
/** `docker run` que falha antes de ficar pronto (imagem ausente). */
const failsToBoot: ContainerBehavior = (container) => queueMicrotask(() => {
  container.complain("docker: Error response from daemon: No such image")
  container.exit(125)
})

async function startedEngine(docker: FakeDocker, overrides: Parameters<typeof engineOptions>[1] = {}): Promise<NativeEngine> {
  const engine = new NativeEngine(engineOptions(docker, overrides))
  await engine.start()
  await settle()
  return engine
}

describe("python-completo: argumentos de isolamento do contêiner", () => {
  const args = buildDockerRunArgs(SPEC)
  const valueOf = (flag: string): string | undefined => args[args.indexOf(flag) + 1]

  it("roda no gVisor, sem rede, com a raiz somente leitura e sem privilégio", () => {
    expect(args).toEqual(expect.arrayContaining([
      "--runtime=runsc", "--network=none", "--read-only", "--cap-drop=ALL", "--security-opt=no-new-privileges", "--pull=never", "--rm", "--log-driver=none",
    ]))
    expect(valueOf("--user")).toBe("65534:65534")
  })

  it("limita CPU, memória (sem swap), processos, descritores e tempo de CPU", () => {
    expect(args).toEqual(expect.arrayContaining(["--cpus=1", "--memory=1024m", "--memory-swap=1024m", "--pids-limit=64"]))
    const ulimits = args.flatMap((arg, index) => (arg === "--ulimit" ? [args[index + 1]] : []))
    expect(ulimits).toEqual(["cpu=60", "core=0", "nofile=256:256"])
    expect(cpuSecondsBudget(1)).toBe(60)
    expect(cpuSecondsBudget(2)).toBe(90)
  })

  it("só /work e /tmp são graváveis: tmpfs pequenos, sem execução", () => {
    const mounts = args.flatMap((arg, index) => (arg === "--tmpfs" ? [args[index + 1]] : []))
    expect(mounts).toEqual(["/work:rw,noexec,nosuid,nodev,size=32m,mode=1777", "/tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777"])
    expect(args).toContain("--shm-size=8m")
  })

  it("não monta nada da máquina, não expõe porta nem socket e não ganha privilégio", () => {
    const forbidden = ["-v", "--volume", "--mount", "--privileged", "--cap-add", "--device", "-p", "--publish", "--pid", "--ipc", "--userns", "--network=host", "--env-file"]
    expect(args.filter((arg) => forbidden.some((flag) => arg === flag || arg.startsWith(`${flag}=`)))).toEqual([])
    expect(args.join(" ")).not.toContain("docker.sock")
  })

  it("o ambiente do contêiner só fixa as threads das bibliotecas (nada do executor)", () => {
    const env = args.flatMap((arg, index) => (arg === "--env" ? [args[index + 1]] : []))
    expect(env).toEqual(["HOME=/tmp", "OMP_NUM_THREADS=1", "OPENBLAS_NUM_THREADS=1", "MKL_NUM_THREADS=1"])
  })

  it("o comando é o Python isolado com o script de partida, o marcador e os módulos do aquecimento", () => {
    expect(valueOf("--entrypoint")).toBe("python3")
    const imageIndex = args.indexOf(SPEC.image)
    expect(args.slice(imageIndex + 1)).toEqual(["-I", "-B", "-c", "print('partida')", NATIVE_READY_MARKER, "numpy", "pandas"])
    expect(valueOf("--label")).toBe(NATIVE_CONTAINER_LABEL)
    expect(valueOf("--name")).toBe("lvl-completo-teste")
  })

  it("o processo docker não recebe o ambiente do executor (nem o RUNNER_TOKEN)", () => {
    const env = dockerEnvironment({ PATH: "/usr/bin", DOCKER_HOST: "unix:///run/user/1000/docker.sock", RUNNER_TOKEN: "segredo", DATABASE_URL: "postgres://x" })
    expect(env).toEqual({ PATH: "/usr/bin", DOCKER_HOST: "unix:///run/user/1000/docker.sock" })
  })
})

describe("python-completo: política runsc/runc", () => {
  it("com runsc usa o gVisor, mesmo que o modo inseguro esteja liberado", () => {
    expect(decideNativeRuntime({ availableRuntimes: ["runc", "runsc"], allowInsecure: false, nodeEnv: "production" })).toEqual({ ok: true, runtime: "runsc", insecure: false })
    expect(decideNativeRuntime({ availableRuntimes: ["runc", "runsc"], allowInsecure: true, nodeEnv: "development" })).toEqual({ ok: true, runtime: "runsc", insecure: false })
  })

  it("sem runsc só aceita runc com a liberação explícita E NODE_ENV=development", () => {
    expect(decideNativeRuntime({ availableRuntimes: ["runc"], allowInsecure: true, nodeEnv: "development" })).toEqual({ ok: true, runtime: "runc", insecure: true })
    expect(decideNativeRuntime({ availableRuntimes: ["runc"], allowInsecure: false, nodeEnv: "development" }).ok).toBe(false)
  })

  it("nunca aceita runc em produção, homologação ou teste", () => {
    for (const nodeEnv of ["production", "homolog", "test", "", "Development"]) {
      const decision = decideNativeRuntime({ availableRuntimes: ["runc", "nvidia"], allowInsecure: true, nodeEnv })
      expect(decision.ok, nodeEnv).toBe(false)
    }
  })

  it("lê os runtimes do docker info, um por linha", () => {
    expect(parseDockerRuntimes("io.containerd.runc.v2\r\nnvidia\nrunc\n\n")).toEqual(["io.containerd.runc.v2", "nvidia", "runc"])
  })
})

describe("python-completo: liga só por configuração e só com isolamento aceito", () => {
  const logs: { level: LogLevel; message: string }[] = []
  const log = (level: LogLevel, message: string): void => void logs.push({ level, message })
  const config = (env: Record<string, string>): ReturnType<typeof loadConfig> => loadConfig({ ...BASE_ENV, ...env })

  it("desligado por padrão: nem consulta o Docker, e o runtime responde 501", async () => {
    const docker = new FakeDocker()
    expect(config({}).RUNNER_NATIVE_ENGINE).toBe("off")
    expect(await createNativeEngine(config({}), log, docker)).toBeUndefined()
    expect(await createNativeEngine(config({ RUNNER_NATIVE_ENGINE: "" }), log, docker)).toBeUndefined()
    expect(docker.commands).toEqual([])
    const executor = new Executor({ python: new NativeEngine(engineOptions(docker)) }, new Semaphore(1, 4))
    expect(() => executor.engineFor("python-completo")).toThrow(RuntimeUnavailableError)
  })

  it("recusa um valor desconhecido em RUNNER_NATIVE_ENGINE", () => {
    expect(() => config({ RUNNER_NATIVE_ENGINE: "docker" })).toThrow(/RUNNER_NATIVE_ENGINE/)
  })

  it("com runsc sobe no gVisor", async () => {
    const engine = await createNativeEngine(config({ RUNNER_NATIVE_ENGINE: "gvisor", NODE_ENV: "production", RUNNER_TOKEN: "9f2c4e7a1b3d5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6" }), log, new FakeDocker())
    expect(engine?.versions.runtime).toBe("gVisor (runsc)")
    expect(engine?.stats()).toMatchObject({ runtime: "runsc", insecure: 0 })
  })

  it("sem runsc não sobe, e diz por quê no log", async () => {
    const docker = new FakeDocker()
    docker.runtimes = ["runc", "nvidia"]
    logs.length = 0
    expect(await createNativeEngine(config({ RUNNER_NATIVE_ENGINE: "gvisor", NODE_ENV: "development" }), log, docker)).toBeUndefined()
    expect(logs).toEqual([{ level: "error", message: expect.stringContaining("NÃO subiu") as string }])
  })

  it("sem runsc, o modo inseguro só sobe em desenvolvimento, com aviso", async () => {
    const docker = new FakeDocker()
    docker.runtimes = ["runc"]
    const insecure = { RUNNER_NATIVE_ENGINE: "gvisor", RUNNER_ALLOW_INSECURE_NATIVE: "1" }
    logs.length = 0
    const engine = await createNativeEngine(config({ ...insecure, NODE_ENV: "development" }), log, docker)
    expect(engine?.stats()).toMatchObject({ runtime: "runc", insecure: 1 })
    expect(engine?.versions.runtime).toContain("INSEGURO")
    expect(logs).toEqual([{ level: "warn", message: expect.stringContaining("INSEGURO") as string }])
    expect(await createNativeEngine(config({ ...insecure, NODE_ENV: "production", RUNNER_TOKEN: "9f2c4e7a1b3d5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6" }), log, docker)).toBeUndefined()
    expect(await createNativeEngine(config({ ...insecure, NODE_ENV: "test" }), log, docker)).toBeUndefined()
  })

  it("Docker fora do ar: não sobe", async () => {
    const docker = new FakeDocker()
    docker.infoCode = 1
    expect(await createNativeEngine(config({ RUNNER_NATIVE_ENGINE: "gvisor" }), log, docker)).toBeUndefined()
  })

  it("recusa módulo de aquecimento que não é um nome de módulo", () => {
    expect(() => new NativeEngine(engineOptions(new FakeDocker(), { preload: ["numpy", "os; import socket"] }))).toThrow(/Módulo inválido/)
  })
})

describe("python-completo: pool aquecido de uso único", () => {
  it("a partida remove órfãos, roda o autoteste e deixa o pool cheio", async () => {
    const docker = new FakeDocker()
    docker.orphans = ["abc123", "def456"]
    const engine = await startedEngine(docker, { warm: 2 })
    expect(engine.readiness).toEqual({ ready: true, reason: "" })
    expect(engine.versions.python).toBe("3.14.10 (nativo)")
    expect(docker.commands).toContainEqual(["ps", "--all", "--quiet", "--filter", `label=${NATIVE_CONTAINER_LABEL}`])
    expect(docker.commands).toContainEqual(["rm", "--force", "abc123", "def456"])
    // 1 do autoteste + 2 do pool, todos com os argumentos de isolamento.
    expect(docker.containers).toHaveLength(3)
    expect(docker.containers.every((container) => container.args.includes("--runtime=runsc") && container.args.includes("--network=none"))).toBe(true)
    expect(engine.stats()).toMatchObject({ idle: 2, ready: 2, warm: 2, launched: 3 })
    expect(engine.warmupMs()).toBe(0)
    await engine.shutdown()
  })

  it("o lote usa o contêiner que já estava pronto, e ele é reposto depois", async () => {
    const docker = new FakeDocker()
    const engine = await startedEngine(docker)
    const pooled = docker.containers[1]
    expect(docker.containers).toHaveLength(2)
    const observations = await engine.run(batch([runProbe("caso-1"), runProbe("caso-2")]))
    expect(observations.map((observation) => ({ id: observation.id, ok: observation.ok }))).toEqual([{ id: "caso-1", ok: true }, { id: "caso-2", ok: true }])
    expect(pooled?.stdin).not.toBe("")
    await settle()
    // Uso único: o contêiner do lote terminou e um novo ocupa o lugar no pool.
    expect(pooled?.hasExited).toBe(true)
    expect(docker.containers).toHaveLength(3)
    expect(docker.containers[2]?.stdin).toBe("")
    expect(engine.stats()).toMatchObject({ batches: 2, idle: 1, ready: 1 })
    await engine.shutdown()
  })

  it("cada lote roda num contêiner diferente", async () => {
    const docker = new FakeDocker()
    const engine = await startedEngine(docker)
    await engine.run(batch([runProbe("a")]))
    await settle()
    await engine.run(batch([runProbe("b")]))
    await settle()
    const used = docker.containers.filter((container) => container.stdin !== "")
    expect(used).toHaveLength(3)
    expect(new Set(used.map((container) => container.name)).size).toBe(3)
    await engine.shutdown()
  })

  it("sem pool (warm 0) o lote sobe o próprio contêiner e paga a partida", async () => {
    const docker = new FakeDocker()
    const engine = await startedEngine(docker, { warm: 0 })
    expect(engine.stats()).toMatchObject({ idle: 0 })
    expect(engine.warmupMs()).toBeGreaterThan(0)
    expect(engine.cost().initialBatchMs).toBeGreaterThan(engine.warmupMs())
    await engine.run(batch([runProbe("a")]))
    await settle()
    expect(docker.containers).toHaveLength(2)
    await engine.shutdown()
  })

  it("contêiner ocioso que morre sai do pool e não é reposto em laço", async () => {
    const docker = new FakeDocker()
    const engine = await startedEngine(docker)
    docker.containers[1]?.exit(1)
    await settle()
    expect(engine.stats()).toMatchObject({ idle: 0, idleDeaths: 1 })
    expect(docker.containers).toHaveLength(2)
    // O próximo lote sobe um contêiner novo e o pool volta.
    await engine.run(batch([runProbe("a")]))
    await settle()
    expect(engine.stats()).toMatchObject({ idle: 1 })
    await engine.shutdown()
  })

  it("encerrar mata os contêineres vivos e para de repor", async () => {
    const docker = new FakeDocker()
    const engine = await startedEngine(docker, { warm: 2 })
    await engine.shutdown()
    await settle()
    expect(docker.containers.every((container) => container.hasExited)).toBe(true)
    expect(docker.removed()).toEqual(expect.arrayContaining([docker.containers[1]?.name, docker.containers[2]?.name]))
    expect(docker.containers).toHaveLength(3)
  })

  it("autoteste reprovado: motor indisponível com o motivo e sem pool", async () => {
    const docker = new FakeDocker()
    docker.behaviors = [failsToBoot]
    const engine = await startedEngine(docker)
    expect(engine.readiness.ready).toBe(false)
    expect(engine.readiness.reason).toContain("No such image")
    expect(engine.stats()).toMatchObject({ idle: 0, bootFailures: 2 })
    const server = buildServer({ executor: { execute: () => Promise.reject(new Error("não usado")) }, token: "t".repeat(24), log: () => undefined, nativeReadiness: engine.readiness })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    const response = await fetch(`http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/healthz`)
    // O motor é opcional: a saúde do executor continua ok e informa o estado dele.
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ status: "ok", completo: { ready: false } })
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })
})

describe("python-completo: protocolo do lote", () => {
  it("o contêiner recebe os arquivos, o harness e as sondas com ids posicionais; nada mais", async () => {
    const docker = new FakeDocker()
    const engine = await startedEngine(docker, { warm: 0 })
    await engine.run(batch([{ id: "caso-secreto-42", kind: "call", function: "soma", args: [1, 2], kwargs: {} }]))
    const used = docker.containers[1]
    const received = used?.received()
    expect(received?.header.files).toEqual([{ path: "main.py", content: "print('oi')\n" }, { path: "pacote/util.py", content: "X = 1\n" }])
    expect(received?.header.harness).toContain("def _run_harness():")
    expect(Object.keys(received?.header ?? {}).sort()).toEqual(["files", "harness"])
    expect(received?.job.probes).toEqual([{ id: "p0", kind: "call", function: "soma", args: [1, 2], kwargs: {} }])
    expect(Object.keys(received?.job ?? {}).sort()).toEqual(["entry", "nonce", "probes", "strict"])
    // Nem o id do caso (que poderia identificar o gabarito) nem o lote aparecem no argv do contêiner.
    expect(used?.stdin).not.toContain("caso-secreto-42")
    expect(used?.args.join(" ")).not.toContain("caso-secreto-42")
    expect(used?.args.join(" ")).not.toContain(received?.job.nonce ?? "?")
    await engine.shutdown()
  })

  it("observação com nonce errado é ignorada (o aluno não forja o resultado)", async () => {
    const docker = new FakeDocker()
    const engine = await startedEngine(docker, { warm: 0 })
    docker.behaviors = [(container) => {
      container.onBatch = () => {
        container.print(`${"0".repeat(32)} ${JSON.stringify({ id: "p0", ok: true, stdout: "forjado" })}\n`)
        container.exit(0)
      }
      queueMicrotask(() => container.becomeReady())
    }]
    const [observation] = await engine.run(batch([runProbe("a")]))
    expect(observation).toEqual({ id: "a", ok: false, error: "O programa terminou de forma inesperada." })
    expect(engine.stats()).toMatchObject({ withoutObservations: 1 })
    await engine.shutdown()
  })

  it("contêiner que escreve antes do marcador de pronto é descartado", async () => {
    const docker = new FakeDocker()
    const engine = await startedEngine(docker, { warm: 0 })
    docker.behaviors = [(container) => queueMicrotask(() => container.print("qualquer coisa\n")), obedient]
    const [observation] = await engine.run(batch([runProbe("a")]))
    expect(observation?.ok).toBe(true)
    expect(docker.containers[1]?.isKilled).toBe(true)
    expect(engine.stats()).toMatchObject({ bootFailures: 1 })
    await engine.shutdown()
  })

  it("só aceita as bibliotecas que o manifesto libera para o motor", () => {
    const engine = new NativeEngine(engineOptions(new FakeDocker()))
    expect(() => engine.accept({ runtime: "python-completo", libraries: ["numpy", "Torch", "pytorch", "sklearn"] })).not.toThrow()
    expect(() => engine.accept({ runtime: "python-completo", libraries: [] })).not.toThrow()
    let caught: unknown
    try {
      engine.accept({ runtime: "python-completo", libraries: ["numpy", "matplotlib", "requests"] })
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(EngineRequestError)
    expect((caught as EngineRequestError).code).toBe("unknown_library")
    expect((caught as EngineRequestError).message).toContain('"matplotlib", "requests"')
  })
})

describe("python-completo: limites e falhas", () => {
  it("tempo limite: mata o contêiner e marca as sondas sem observação", async () => {
    const docker = new FakeDocker()
    const engine = await startedEngine(docker, { warm: 0 })
    docker.behaviors = [stuck]
    const startedAt = performance.now()
    const observations = await engine.run(batch([runProbe("a"), runProbe("b")], 40))
    expect(performance.now() - startedAt).toBeLessThan(1_000)
    expect(observations).toEqual([
      { id: "a", ok: false, timedOut: true, error: "Tempo limite excedido (verifique laços infinitos)." },
      { id: "b", ok: false, timedOut: true, error: "Tempo limite excedido (verifique laços infinitos)." },
    ])
    const used = docker.containers[1]
    expect(used?.isKilled || used?.hasExited).toBe(true)
    expect(docker.removed()).toContain(used?.name)
    expect(engine.stats()).toMatchObject({ timedOut: 1 })
    await engine.shutdown()
  })

  it("tempo limite preserva as observações que saíram antes", async () => {
    const docker = new FakeDocker()
    const engine = await startedEngine(docker, { warm: 0 })
    docker.behaviors = [(container) => {
      container.onBatch = ({ job }) => container.print(`${job.nonce} ${JSON.stringify({ id: "p0", ok: true, stdout: "primeira" })}\n`)
      queueMicrotask(() => container.becomeReady())
    }]
    const observations = await engine.run(batch([runProbe("a"), runProbe("b")], 40))
    expect(observations[0]).toEqual({ id: "a", ok: true, stdout: "primeira" })
    expect(observations[1]).toMatchObject({ id: "b", ok: false, timedOut: true })
    await engine.shutdown()
  })

  it("saída grande demais: corta e mata o contêiner", async () => {
    const docker = new FakeDocker()
    const engine = await startedEngine(docker, { warm: 0 })
    docker.behaviors = [(container) => {
      container.onBatch = () => {
        for (let megabyte = 0; megabyte < 9 && !container.hasExited; megabyte++) container.print(Buffer.alloc(1024 * 1024, "x"))
      }
      queueMicrotask(() => container.becomeReady())
    }]
    const [observation] = await engine.run(batch([runProbe("a")]))
    expect(observation).toEqual({ id: "a", ok: false, error: "Saída grande demais: o programa imprimiu dados demais." })
    expect(engine.stats()).toMatchObject({ overflowed: 1 })
    await engine.shutdown()
  })

  it("contêiner morto pelo limite de memória (137) vira mensagem de memória", async () => {
    const docker = new FakeDocker()
    const engine = await startedEngine(docker, { warm: 0 })
    docker.behaviors = [(container) => {
      container.onBatch = () => container.exit(137)
      queueMicrotask(() => container.becomeReady())
    }]
    const [observation] = await engine.run(batch([runProbe("a")]))
    expect(observation).toEqual({ id: "a", ok: false, error: "Memória insuficiente: o programa usou mais memória do que o permitido." })
    expect(engine.stats()).toMatchObject({ outOfMemory: 1 })
    await engine.shutdown()
  })

  it("partida que falha uma vez é tentada de novo; duas vezes, o lote falha", async () => {
    const docker = new FakeDocker()
    const engine = await startedEngine(docker, { warm: 0 })
    docker.behaviors = [failsToBoot, obedient]
    expect((await engine.run(batch([runProbe("a")])))[0]?.ok).toBe(true)
    docker.behaviors = [failsToBoot]
    await expect(engine.run(batch([runProbe("b")]))).rejects.toThrow(/No such image/)
    await engine.shutdown()
  })

  it("contêiner que não fica pronto no prazo é morto", async () => {
    const docker = new FakeDocker()
    const engine = await startedEngine(docker, { warm: 0, bootTimeoutMs: 30 })
    docker.behaviors = [() => undefined]
    await expect(engine.run(batch([runProbe("a")]))).rejects.toThrow(/não ficou pronto/)
    expect(docker.containers.slice(1).every((container) => container.hasExited)).toBe(true)
    await engine.shutdown()
  })
})
