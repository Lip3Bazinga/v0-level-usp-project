/**
 * Pilha descartável das medições: PostgreSQL em volume Docker próprio (`levelusp-bench-*`) + migrações
 * + conteúdo importado + API compilada numa porta livre. Usada por carga.mts e latencia.mts.
 *
 * Garantias contra tocar o banco de desenvolvimento:
 *  - a porta da API é sorteada livre (ou, se pedida, precisa estar livre: senão aborta);
 *  - antes de medir, um aluno de prova é criado pela API e o script confere, por `psql` DENTRO do
 *    contêiner descartável, que a conta apareceu lá. Se a API que responde não escreve nesse banco,
 *    a execução é interrompida.
 */
import { spawn, type ChildProcess } from "node:child_process"
import { existsSync, mkdirSync } from "node:fs"
import net from "node:net"
import os from "node:os"
import path from "node:path"
import { ApiClient, newCredentials } from "./api.mts"
import { type BenchDatabase, createBenchDatabase, DB_NAME, DB_USER } from "./docker.mts"
import { DEFAULT_BUNDLE, REPO_ROOT, runProgram, runShell, sleep } from "./sistema.mts"

/** Limpeza em ordem inversa, uma vez só, também em Ctrl+C/SIGTERM. */
export class Limpeza {
  readonly abort = new AbortController()
  private readonly steps: (() => Promise<void>)[] = []
  private running: Promise<void> | null = null

  /** Registra um passo de limpeza (o último registrado roda primeiro). */
  add(step: () => Promise<void>): void {
    this.steps.push(step)
  }

  /** Executa os passos (idempotente); um passo que falha não impede os seguintes. */
  run(): Promise<void> {
    this.running ??= (async () => {
      for (const step of [...this.steps].reverse()) await step().catch((error: unknown) => console.error(`limpeza: ${error instanceof Error ? error.message : String(error)}`))
    })()
    return this.running
  }

  /** Em SIGINT/SIGTERM: aborta as esperas, limpa e sai com 130. */
  installSignals(): void {
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
      process.once(signal, () => {
        console.error(`\n${signal}: encerrando e apagando o banco descartável…`)
        this.abort.abort()
        void this.run().finally(() => process.exit(130))
      })
    }
  }
}

/** Há algo escutando (ou impedindo o bind) em `port`? */
export async function isPortInUse(port: number): Promise<boolean> {
  const accepted = await new Promise<boolean>((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" })
    socket.setTimeout(1_000, () => {
      socket.destroy()
      resolve(false)
    })
    socket.once("connect", () => {
      socket.destroy()
      resolve(true)
    })
    socket.once("error", () => resolve(false))
  })
  if (accepted) return true
  return new Promise<boolean>((resolve) => {
    const server = net.createServer()
    server.once("error", () => resolve(true))
    server.listen(port, "0.0.0.0", () => server.close(() => resolve(false)))
  })
}

/** Uma porta livre sorteada pelo sistema operacional. */
export function pickFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once("error", reject)
    server.listen(0, "0.0.0.0", () => {
      const address = server.address()
      server.close(() => (typeof address === "object" && address !== null ? resolve(address.port) : reject(new Error("sem porta livre"))))
    })
  })
}

/** Pilha pronta. */
export interface Pilha {
  apiUrl: string
  database: BenchDatabase
}

/**
 * Sobe a pilha descartável. A limpeza (matar a API, apagar contêiner e volume) fica registrada em
 * `limpeza`, inclusive se a criação falhar ou for interrompida no meio.
 *
 * @param options.port porta da API; ausente = uma livre. Pedida e ocupada = erro (nunca reaproveita API alheia).
 * @throws Error se algo não subir ou se a API não gravar no banco descartável.
 */
export async function iniciarPilha(options: { runnerUrl: string; token: string; port?: number | undefined; limpeza: Limpeza }): Promise<Pilha> {
  const { limpeza } = options
  const entry = path.join(REPO_ROOT, "apps", "api", "dist", "main.js")
  if (!existsSync(entry)) throw new Error("apps/api/dist/main.js não existe: rode `pnpm build` antes.")
  if (options.port !== undefined && (await isPortInUse(options.port))) {
    throw new Error(`a porta ${options.port} já está em uso (provavelmente outra API, talvez a de desenvolvimento): escolha outra com --api-porta ou omita a opção.`)
  }
  const port = options.port ?? (await pickFreePort())

  console.log("  banco descartável (volume Docker próprio)…")
  let database: BenchDatabase | null = null
  database = await createBenchDatabase((destroy) =>
    limpeza.add(async () => {
      await destroy()
      if (database !== null) {
        const exists = (await runProgram("docker", ["volume", "inspect", database.volume])).ok
        console.log(exists ? `AVISO: o volume ${database.volume} ainda existe: rode \`node scripts/bench/carga.mts --limpar\`` : `Banco descartável apagado (${database.container}, ${database.volume}).`)
      }
    }),
  )
  console.log(`  contêiner ${database.container}, volume ${database.volume}, 127.0.0.1:${database.hostPort}`)

  console.log("  migrações e importação do pacote de conteúdo…")
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: database.url, SEED_CONTENT: "true" }
  if ((await runShell("pnpm --filter @levelusp/db migrate", { env })) !== 0) throw new Error("falha nas migrações do banco descartável")
  if ((await runShell("pnpm --filter @levelusp/db seed", { env })) !== 0) throw new Error("falha ao importar o conteúdo no banco descartável")
  console.log(`  (conteúdo importado de ${path.relative(REPO_ROOT, DEFAULT_BUNDLE).replace(/\\/g, "/")} e demais pacotes de packages/db/seed)`)

  console.log(`  API de teste na porta ${port}…`)
  const api = startApi({ entry, port, databaseUrl: database.url, runnerUrl: options.runnerUrl, token: options.token })
  limpeza.add(async () => {
    api.child.kill()
  })
  const apiUrl = `http://127.0.0.1:${port}`
  await waitApiReady(apiUrl, api, 120_000)
  await confirmApiUsesDatabase(apiUrl, api, database)
  return { apiUrl, database }
}

interface ApiProcess {
  child: ChildProcess
  tail: () => string
}

function startApi(options: { entry: string; port: number; databaseUrl: string; runnerUrl: string; token: string }): ApiProcess {
  const uploads = path.join(os.tmpdir(), "levelusp-bench-uploads")
  mkdirSync(uploads, { recursive: true })
  const child = spawn(process.execPath, [options.entry], {
    cwd: path.dirname(path.dirname(options.entry)),
    env: {
      ...process.env,
      NODE_ENV: "production",
      APP_ENV: "dev",
      PORT: String(options.port),
      DATABASE_URL: options.databaseUrl,
      RUNNER_URL: options.runnerUrl,
      RUNNER_TOKEN: options.token,
      LOG_LEVEL: "warn",
      SWAGGER_ENABLED: "false",
      TRUST_PROXY: "true",
      // Todos os alunos saem do mesmo IP: sem isto o limite de credenciais por IP (60/min) barraria o cadastro em massa.
      AUTH_THROTTLE_LIMIT: "1000000",
      UPLOAD_DIR: uploads,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  })
  let tail = ""
  const keep = (chunk: Buffer): void => {
    tail = (tail + chunk.toString("utf8")).slice(-4_000)
  }
  child.stdout?.on("data", keep)
  child.stderr?.on("data", keep)
  return { child, tail: () => tail }
}

async function waitApiReady(apiUrl: string, api: ApiProcess, timeoutMs: number): Promise<void> {
  const client = new ApiClient(apiUrl, { timeoutMs: 5_000 })
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (api.child.exitCode !== null) throw new Error(`a API de teste encerrou (código ${api.child.exitCode}). Últimas linhas:\n${api.tail()}`)
    if ((await client.request("GET", "/api/health/ready")).status === 200) {
      // Um 200 só vale se o processo filho continua vivo: se a porta fosse de outra API, o filho já teria morrido (EADDRINUSE).
      await sleep(1_500)
      if (api.child.exitCode !== null) throw new Error(`a API de teste encerrou logo depois de "pronta" (código ${api.child.exitCode}): a porta pode ter sido tomada por outro processo. Últimas linhas:\n${api.tail()}`)
      return
    }
    await sleep(1_000)
  }
  throw new Error(`a API de teste não ficou pronta em ${timeoutMs / 1000} s. Últimas linhas:\n${api.tail()}`)
}

/** Cria um aluno de prova pela API e confere, dentro do contêiner descartável, que a conta foi gravada ali. */
async function confirmApiUsesDatabase(apiUrl: string, api: ApiProcess, database: BenchDatabase): Promise<void> {
  const credentials = newCredentials("prova")
  await new ApiClient(apiUrl).signUp(credentials)
  const query = `select count(*) from users where email = '${credentials.email}'`
  const result = await runProgram("docker", ["exec", database.container, "psql", "-U", DB_USER, "-d", DB_NAME, "-tA", "-c", query], { timeoutMs: 20_000 })
  if (!result.ok || result.stdout.trim() !== "1" || api.child.exitCode !== null) {
    throw new Error("INTERROMPIDO: a API que respondeu não gravou no banco descartável (outro processo na porta?). Nada foi medido, para não sujar o banco de desenvolvimento.")
  }
}
