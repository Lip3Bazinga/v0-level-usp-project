import path from "node:path"
import type { RunnerConfig } from "./config.js"
import { createDockerClient, type DockerClient } from "./docker-cli.js"
import type { Logger } from "./logger.js"
import { NativeEngine } from "./native-engine.js"
import { decideNativeRuntime, DOCKER_RUNTIMES_FORMAT, parseDockerRuntimes } from "./native-policy.js"

/** Prazo do `docker info` da partida. */
const DOCKER_INFO_TIMEOUT_MS = 10_000

/** O que {@link createNativeEngine} lê da configuração do executor. */
export type NativeEngineConfig = Pick<
  RunnerConfig,
  | "RUNNER_NATIVE_ENGINE" | "RUNNER_ALLOW_INSECURE_NATIVE" | "RUNNER_NATIVE_IMAGE" | "DOCKER_BIN" | "RUNNER_NATIVE_WARM"
  | "RUNNER_NATIVE_MEMORY_MB" | "RUNNER_NATIVE_CPUS" | "RUNNER_NATIVE_PIDS_LIMIT" | "RUNNER_NATIVE_BOOT_TIMEOUT_MS" | "RUNNER_NATIVE_PRELOAD"
  | "NATIVE_BOOTSTRAP_PATH" | "HARNESS_PATH" | "MAX_JOB_DISK_MB"
>

/**
 * Cria o motor `python-completo` se ele estiver ligado E o Docker oferecer um runtime aceito
 * pela política (`decideNativeRuntime`). Em todo outro caso devolve `undefined` e registra o
 * motivo no log: o executor segue no ar e o runtime `python-completo` responde 501.
 *
 * @param docker cliente do Docker (padrão: o binário `DOCKER_BIN`; os testes passam um simulado).
 * @param nodeEnv `NODE_ENV` CRU do processo, não o da configuração: lá, ausente vira
 *        `development` (padrão cômodo para o resto do executor), e aqui ausente NÃO pode liberar o
 *        `runc`. O modo inseguro exige `NODE_ENV=development` escrito no ambiente.
 */
export async function createNativeEngine(
  config: NativeEngineConfig,
  log: Logger,
  docker: DockerClient = createDockerClient(config.DOCKER_BIN),
  nodeEnv: string | undefined = process.env.NODE_ENV,
): Promise<NativeEngine | undefined> {
  if (config.RUNNER_NATIVE_ENGINE === "off") return undefined
  const info = await docker.exec(["info", "--format", DOCKER_RUNTIMES_FORMAT], DOCKER_INFO_TIMEOUT_MS)
  if (info.code !== 0) {
    log("error", "motor python-completo NÃO subiu: o Docker não respondeu ao `docker info`", { code: info.code, stderr: info.stderr.slice(0, 500) })
    return undefined
  }
  const decision = decideNativeRuntime({ availableRuntimes: parseDockerRuntimes(info.stdout), allowInsecure: config.RUNNER_ALLOW_INSECURE_NATIVE, nodeEnv: nodeEnv ?? "" })
  if (!decision.ok) {
    log("error", "motor python-completo NÃO subiu: sem isolamento aceitável", { reason: decision.reason })
    return undefined
  }
  if (decision.insecure) {
    log("warn", "motor python-completo em modo INSEGURO (runc, sem gVisor): o código do aluno divide o kernel desta máquina. Só para desenvolvimento.", { runtime: decision.runtime })
  }
  return new NativeEngine({
    docker,
    image: config.RUNNER_NATIVE_IMAGE,
    runtime: decision.runtime,
    insecure: decision.insecure,
    harnessPath: config.HARNESS_PATH,
    bootstrapPath: config.NATIVE_BOOTSTRAP_PATH ?? path.join(path.dirname(config.HARNESS_PATH), "native_bootstrap.py"),
    warm: config.RUNNER_NATIVE_WARM,
    memoryMb: config.RUNNER_NATIVE_MEMORY_MB,
    cpus: config.RUNNER_NATIVE_CPUS,
    pidsLimit: config.RUNNER_NATIVE_PIDS_LIMIT,
    workDiskMb: config.MAX_JOB_DISK_MB,
    bootTimeoutMs: config.RUNNER_NATIVE_BOOT_TIMEOUT_MS,
    preload: config.RUNNER_NATIVE_PRELOAD,
    log,
  })
}
