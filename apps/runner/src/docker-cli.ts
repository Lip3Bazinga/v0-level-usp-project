import { spawn } from "node:child_process"

/**
 * Acesso ao Docker pelo binário `docker` (sem biblioteca: menos superfície). O motor
 * `python-completo` só fala com o Docker por esta interface, que os testes substituem
 * por um Docker simulado.
 */

/** Um `docker run -i` em andamento: a entrada e a saída são as do contêiner. */
export interface DockerProcess {
  /** Escreve na entrada padrão do contêiner. */
  write(data: string): void
  /** Fecha a entrada padrão do contêiner (EOF). */
  end(): void
  /** Registra quem recebe cada pedaço da saída padrão do contêiner. */
  onStdout(listener: (chunk: Buffer) => void): void
  /** Registra quem recebe cada pedaço da saída de erro (do contêiner e do próprio `docker`). */
  onStderr(listener: (chunk: Buffer) => void): void
  /** Mata o processo `docker` local (o contêiner é removido à parte, com `docker rm -f`). */
  kill(): void
  /** Resolve com o código de saída quando o processo termina (`null`: morto por sinal ou não iniciou). Nunca rejeita. */
  readonly exited: Promise<number | null>
}

/** Resultado de um comando curto do Docker. */
export interface DockerResult {
  code: number | null
  stdout: string
  stderr: string
}

/** O que o motor precisa do Docker. */
export interface DockerClient {
  /** Inicia `docker <args>` ligado à entrada e à saída do contêiner. */
  spawn(args: readonly string[]): DockerProcess
  /** Roda um comando curto (`info`, `rm -f`, `ps`) e junta a saída; nunca rejeita (falha = `code` diferente de 0). */
  exec(args: readonly string[], timeoutMs?: number): Promise<DockerResult>
}

/** Prazo padrão de um comando curto do Docker. */
const DEFAULT_EXEC_TIMEOUT_MS = 15_000
/** Teto do que se guarda da saída de um comando curto. */
const MAX_EXEC_OUTPUT_CHARS = 256 * 1024
/**
 * Variáveis que o binário `docker` recebe: só o que ele precisa para achar o daemon e a
 * própria configuração. O resto do ambiente do executor (inclusive o `RUNNER_TOKEN`) não vai
 * nem para o processo `docker`; o contêiner, de qualquer modo, nunca herda o ambiente do cliente.
 */
const DOCKER_ENV_ALLOWLIST = [
  "PATH", "HOME", "USERPROFILE", "SystemRoot", "ProgramData", "APPDATA", "LOCALAPPDATA", "XDG_RUNTIME_DIR",
  "DOCKER_HOST", "DOCKER_CONTEXT", "DOCKER_CONFIG", "DOCKER_TLS_VERIFY", "DOCKER_CERT_PATH",
] as const

/** Recorta do ambiente só as variáveis que o `docker` precisa ({@link DOCKER_ENV_ALLOWLIST}). */
export function dockerEnvironment(env: NodeJS.ProcessEnv): Record<string, string> {
  const allowed: Record<string, string> = {}
  for (const name of DOCKER_ENV_ALLOWLIST) {
    const value = env[name]
    if (value !== undefined) allowed[name] = value
  }
  return allowed
}

/** Cliente real: executa o binário `dockerBin` com o ambiente recortado por {@link dockerEnvironment}. */
export function createDockerClient(dockerBin: string, env: NodeJS.ProcessEnv = process.env): DockerClient {
  const childEnv = dockerEnvironment(env)
  return {
    spawn(args): DockerProcess {
      const child = spawn(dockerBin, [...args], { env: childEnv, stdio: ["pipe", "pipe", "pipe"], windowsHide: true })
      // Contêiner morto antes de ler tudo: o EPIPE não pode derrubar o executor.
      child.stdin.on("error", () => undefined)
      const exited = new Promise<number | null>((resolve) => {
        child.once("error", () => resolve(null))
        child.once("close", (code) => resolve(code))
      })
      return {
        write: (data) => void child.stdin.write(data, "utf8"),
        end: () => void child.stdin.end(),
        onStdout: (listener) => void child.stdout.on("data", listener),
        onStderr: (listener) => void child.stderr.on("data", listener),
        kill: () => void child.kill("SIGKILL"),
        exited,
      }
    },
    exec(args, timeoutMs = DEFAULT_EXEC_TIMEOUT_MS): Promise<DockerResult> {
      return new Promise((resolve) => {
        const child = spawn(dockerBin, [...args], { env: childEnv, stdio: ["ignore", "pipe", "pipe"], windowsHide: true })
        let stdout = ""
        let stderr = ""
        child.stdout.on("data", (chunk: Buffer) => {
          if (stdout.length < MAX_EXEC_OUTPUT_CHARS) stdout += chunk.toString("utf8")
        })
        child.stderr.on("data", (chunk: Buffer) => {
          if (stderr.length < MAX_EXEC_OUTPUT_CHARS) stderr += chunk.toString("utf8")
        })
        const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs)
        child.once("error", (error) => {
          clearTimeout(timer)
          resolve({ code: null, stdout, stderr: stderr || error.message })
        })
        child.once("close", (code) => {
          clearTimeout(timer)
          resolve({ code, stdout, stderr })
        })
      })
    },
  }
}
