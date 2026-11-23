/**
 * Teste de carga contra a API LOCAL, com banco descartável e alunos virtuais com tempo de pensar.
 *
 *   node scripts/bench/carga.mts [--motores python,dados,ml] [--niveis 10,25,50,100] [--duracao-s 300] …
 *   node scripts/bench/carga.mts --limpar        # apaga sobras levelusp-bench-* de uma execução interrompida
 *
 * O que o script faz (e desfaz):
 *   1. sobe um PostgreSQL 17 num volume Docker PRÓPRIO (`levelusp-bench-<id>-pgdata`), em 127.0.0.1;
 *   2. aplica as migrações e importa o pacote de conteúdo nesse banco (`pnpm db:migrate` / `db:seed`);
 *   3. inicia a API compilada (`apps/api/dist/main.js`) numa porta local apontando para esse banco e
 *      para o executor que já está rodando (`RUNNER_URL`, `RUNNER_TOKEN` do ambiente);
 *   4. cria os alunos por script e, para cada motor e cada nível N, roda N alunos virtuais: cada um
 *      envia a solução de um exercício a cada 30–60 s (sorteado), uma parte das vezes errada;
 *   5. ao final (ou em Ctrl+C), para a API e APAGA contêiner e volume. Nada do volume de dev é tocado.
 *
 * Fila do executor: lida de `GET /v1/stats` (pending/active/peakPending). Sem a rota, a coluna fica
 * vazia e `emvoo_max_cliente` (maior nº de envios simultâneos no cliente) é a aproximação.
 *
 * Saída: docs/tcc/dados/carga.csv (uma linha por motor × N), carga-saturacao.csv, amostras de
 * CPU/memória em recursos.csv (tipo `carga`) e a seção "carga" de ambiente.json.
 */
import { spawn, type ChildProcess } from "node:child_process"
import { existsSync, mkdirSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { ApiClient, newCredentials } from "./lib/api.mts"
import { flagOption, listOption, numberOption, parseArgs, rangeOption, rejectUnknown, stringOption } from "./lib/args.mts"
import { type AlvoResolvido, ALVOS_CARGA, loadBundle, type Motor, prepararAluno, resolverAlvo, submitRoute, type SubmitResponse } from "./lib/conteudo.mts"
import { type BenchDatabase, cleanBenchResidue, createBenchDatabase, dockerAvailable } from "./lib/docker.mts"
import { appendCsv, formatTable, percentile, round, startCsv } from "./lib/estatistica.mts"
import { RECURSOS_CSV, startSampler } from "./lib/recursos.mts"
import { RunnerClient, requireRunnerToken, type RunnerStats } from "./lib/runner.mts"
import { collectEnvironment, DATA_DIR, DEFAULT_BUNDLE, nowIso, randomBetween, REPO_ROOT, runProgram, runShell, seededRandom, sleep, updateEnvironmentFile } from "./lib/sistema.mts"

const KNOWN_OPTIONS = ["motores", "niveis", "duracao-s", "pensar-s", "runner-url", "api-porta", "p-errado", "limite-p95-ms", "limite-erro", "semente", "saida", "conteiner", "sem-recursos", "pacote", "parar-na-saturacao", "limpar", "ajuda"]
const CSV_HEADER = [
  "motor", "perfil", "usuarios", "duracao_s", "pensar_min_s", "pensar_max_s", "envios", "ok_200", "aprovados", "rejeitados_503", "limitados_429", "outros_erros", "taxa_erro",
  "p50_ms", "p95_ms", "p99_ms", "max_ms", "runner_exec_p95_ms", "runner_fila_p95_ms", "fila_max_runner", "ativos_max_runner", "pico_fila_runner", "capacidade_runner",
  "emvoo_max_cliente", "vazao_envios_s", "saturou", "motivo_saturacao", "inicio",
] as const
const SATURATION_HEADER = ["motor", "n_saturacao", "criterio", "limite_p95_ms", "limite_erro", "maior_n_sem_saturar"] as const
const REQUEST_TIMEOUT_MS = 60_000
const SETUP_CONCURRENCY = 4

const HELP = `Uso: node scripts/bench/carga.mts [opções]
  --motores python,dados,ml   motores medidos (padrão: os três)
  --niveis 10,25,50,100       alunos simultâneos (padrão 10,25,50,100)
  --duracao-s N               duração de cada nível (padrão 300)
  --pensar-s 30-60            tempo de pensar entre envios, sorteado (padrão 30-60)
  --p-errado 0.4              fração de envios com solução errada do pacote (padrão 0.4)
  --limite-p95-ms 10000       p95 acima disto = saturado (padrão 10000)
  --limite-erro 0.01          taxa de erro acima disto = saturado (padrão 0.01)
  --parar-na-saturacao        não roda os níveis maiores do motor depois de saturar
  --runner-url URL            executor (padrão $RUNNER_URL ou http://localhost:8081); token em $RUNNER_TOKEN
  --api-porta N               porta da API de teste (padrão 4100)
  --conteiner REGEX           contêineres amostrados (padrão "runner|levelusp-bench-"); --sem-recursos desliga
  --semente N                 semente dos sorteios (repetível)
  --saida ARQUIVO             CSV (padrão docs/tcc/dados/carga.csv)
  --limpar                    apaga sobras levelusp-bench-* e sai`

interface Aluno {
  index: number
  client: ApiClient
  prepared: Set<Motor>
}

interface Envio {
  ms: number
  status: number
  passou: boolean | null
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (flagOption(args, "ajuda")) return void console.log(HELP)
  rejectUnknown(args, KNOWN_OPTIONS)
  if (!(await dockerAvailable())) throw new Error("o Docker não responde (necessário para o banco descartável)")
  if (flagOption(args, "limpar")) {
    const removed = await cleanBenchResidue()
    console.log(removed.length === 0 ? "Nada a limpar." : `Apagados:\n- ${removed.join("\n- ")}`)
    return
  }

  const motores = listOption(args, "motores", ["python", "dados", "ml"]).map(asMotor)
  const niveis = listOption(args, "niveis", ["10", "25", "50", "100"]).map(Number)
  const duration = numberOption(args, "duracao-s", 300)
  const [thinkMin, thinkMax] = rangeOption(args, "pensar-s", [30, 60])
  const pWrong = numberOption(args, "p-errado", 0.4)
  const limitP95 = numberOption(args, "limite-p95-ms", 10_000)
  const limitError = numberOption(args, "limite-erro", 0.01)
  const apiPort = numberOption(args, "api-porta", 4100)
  const random = seededRandom(numberOption(args, "semente", Date.now() % 1_000_000))
  const csvFile = path.resolve(stringOption(args, "saida", path.join(DATA_DIR, "carga.csv")))
  const containerPattern = new RegExp(stringOption(args, "conteiner", "runner|levelusp-bench-"))
  const sampleResources = !flagOption(args, "sem-recursos")
  const stopAtSaturation = flagOption(args, "parar-na-saturacao")
  const runnerUrl = stringOption(args, "runner-url", process.env.RUNNER_URL ?? "http://localhost:8081")
  const token = requireRunnerToken()
  const bundleFile = path.resolve(stringOption(args, "pacote", DEFAULT_BUNDLE))
  const apiEntry = path.join(REPO_ROOT, "apps", "api", "dist", "main.js")
  if (!existsSync(apiEntry)) throw new Error("apps/api/dist/main.js não existe: rode `pnpm build` antes.")
  if (niveis.some((level) => !Number.isInteger(level) || level < 1)) throw new Error("--niveis precisa de inteiros positivos")

  const runner = new RunnerClient(runnerUrl, token)
  if (!(await runner.health()).ok) throw new Error(`executor sem resposta em ${runnerUrl}/healthz`)
  const initial = await runner.stats()
  if (initial === null) console.warn("AVISO: /v1/stats indisponível: fila do executor será derivada no cliente.")
  const estimateMin = Math.round((motores.length * niveis.length * (duration + 40)) / 60)
  console.log(`Plano: motores ${motores.join(",")}; níveis ${niveis.join(",")}; ${duration} s cada (≈ ${estimateMin} min + preparação).`)

  const cleanups: (() => Promise<void>)[] = []
  let cleaning: Promise<void> | null = null
  const cleanup = (): Promise<void> => {
    cleaning ??= (async () => {
      for (const step of cleanups.reverse()) await step().catch(() => undefined)
    })()
    return cleaning
  }
  const abort = new AbortController()
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      console.error(`\n${signal}: encerrando e apagando o banco descartável…`)
      abort.abort()
      void cleanup().finally(() => process.exit(130))
    })
  }

  try {
    console.log("\n[1/4] banco descartável (volume Docker próprio)…")
    const db = await createBenchDatabase()
    cleanups.push(async () => {
      await db.destroy()
      const exists = (await runProgram("docker", ["volume", "inspect", db.volume])).ok
      console.log(exists ? `AVISO: o volume ${db.volume} ainda existe: rode --limpar` : `Banco descartável apagado (${db.container}, ${db.volume}).`)
    })
    console.log(`  contêiner ${db.container}, volume ${db.volume}, 127.0.0.1:${db.hostPort}`)

    console.log("[2/4] migrações e importação do pacote de conteúdo…")
    await prepareDatabase(db, bundleFile)

    console.log("[3/4] API de teste…")
    const api = startApi({ entry: apiEntry, port: apiPort, databaseUrl: db.url, runnerUrl, token })
    cleanups.push(async () => {
      api.child.kill()
    })
    const apiUrl = `http://127.0.0.1:${apiPort}`
    await waitApiReady(apiUrl, api, 120_000)

    console.log("[4/4] resolvendo exercícios e rodando os níveis…")
    const bundle = loadBundle(bundleFile)
    const admin = new ApiClient(apiUrl, { forwardedFor: "10.250.0.1" })
    const alvos = new Map<Motor, AlvoResolvido>()
    for (const motor of motores) {
      const alvo = ALVOS_CARGA[motor]
      alvos.set(motor, await resolverAlvo(admin, bundle, alvo))
      console.log(`  ${motor}: ${alvo.descricao} (${alvo.licao}, passo ${alvo.passo})`)
    }

    startCsv(csvFile, CSV_HEADER)
    const saturationFile = path.join(path.dirname(csvFile), "carga-saturacao.csv")
    startCsv(saturationFile, SATURATION_HEADER)
    const pool: Aluno[] = []
    const saturationRows: (string | number | null)[][] = []
    const summary: (string | number | null)[][] = []
    let noContainerWarned = false

    for (const motor of motores) {
      const alvo = alvos.get(motor)
      if (!alvo) continue
      let saturatedAt: { n: number; reason: string } | null = null
      let lastOk: number | null = null
      for (const n of niveis) {
        if (abort.signal.aborted) break
        if (saturatedAt !== null && stopAtSaturation) break
        console.log(`\n== ${motor}, ${n} alunos, ${duration} s ==`)
        await ensureStudents(pool, n, alvo, apiUrl, motor)
        const sampler = sampleResources ? startSampler(RECURSOS_CSV, { tipo: "carga", rotulo: `carga-${motor}-n${n}`, motor, k: n }, containerPattern, 4_000) : null
        const level = await runLevel({ students: pool.slice(0, n), alvo, runner, duration, thinkMin, thinkMax, pWrong, random, signal: abort.signal })
        const samples = sampler ? await sampler.stop() : []
        if (sampler && !noContainerWarned && !samples.some((sample) => /runner/.test(sample.container))) {
          noContainerWarned = true
          console.warn("AVISO: nenhum contêiner 'runner' foi amostrado (executor fora do Docker?): CPU/memória do executor não foram registradas.")
        }
        const saturation = judge(level, limitP95, limitError)
        if (saturation !== null && saturatedAt === null) saturatedAt = { n, reason: saturation }
        if (saturation === null) lastOk = n
        appendCsv(csvFile, [rowOf(motor, alvo, n, duration, thinkMin, thinkMax, level, saturation)])
        summary.push([motor, n, level.envios.length, round(level.p95), `${round(level.errorRate * 100)}%`, level.maxPending, level.maxInFlight, saturation ?? "ok"])
        console.log(`  envios ${level.envios.length}, p95 ${round(level.p95, 0) ?? "-"} ms, erro ${round(level.errorRate * 100)}%, fila máx ${level.maxPending ?? "?"}, ${saturation ?? "sem saturação"}`)
        await cooldown(runner, abort.signal)
      }
      saturationRows.push([motor, saturatedAt?.n ?? null, saturatedAt?.reason ?? `não saturou até N=${Math.max(...niveis)}`, limitP95, limitError, lastOk])
    }
    appendCsv(saturationFile, saturationRows)
    console.log("\nResumo:")
    console.log(formatTable(["motor", "N", "envios", "p95_ms", "erro", "fila_max", "emvoo_max", "veredito"], summary))
    console.log("\nSaturação:")
    console.log(formatTable(SATURATION_HEADER, saturationRows))

    const finalStats = await runner.stats()
    updateEnvironmentFile("carga", {
      ...(await collectEnvironment()),
      executor: { url: runnerUrl, capacidade: finalStats?.capacity ?? null, fila_maxima: finalStats?.maxQueue ?? null, healthz: (await runner.health()).body },
      banco: "PostgreSQL 17 (postgres:17-alpine) em volume Docker descartável, configuração padrão da imagem",
      api: { node: process.version, pool_conexoes: "padrão (10)", log: "warn" },
      parametros: { motores, niveis, duracao_s: duration, pensar_s: [thinkMin, thinkMax], p_errado: pWrong, limite_p95_ms: limitP95, limite_erro: limitError, alvos: Object.fromEntries([...alvos].map(([motor, alvo]) => [motor, `${alvo.alvo.licao}#${alvo.alvo.passo}`])) },
      gerador: "mesma máquina da API e do banco: divide a CPU com o sistema medido",
    })
  } finally {
    await cleanup()
  }
}

function asMotor(value: string): Motor {
  if (value === "python" || value === "dados" || value === "ml") return value
  throw new Error(`motor desconhecido: ${value} (use python, dados ou ml)`)
}

/** Migra e importa o pacote no banco descartável (as variáveis do banco só existem neste subprocesso). */
async function prepareDatabase(db: BenchDatabase, bundleFile: string): Promise<void> {
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: db.url, SEED_CONTENT: "true" }
  if (path.resolve(bundleFile) !== path.resolve(DEFAULT_BUNDLE)) console.warn("AVISO: --pacote diferente do padrão: o seed importa os pacotes de packages/db/seed/*.json, não esse arquivo.")
  if ((await runShell("pnpm --filter @levelusp/db migrate", { env })) !== 0) throw new Error("falha nas migrações do banco descartável")
  if ((await runShell("pnpm --filter @levelusp/db seed", { env })) !== 0) throw new Error("falha ao importar o conteúdo no banco descartável")
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
    if ((await client.request("GET", "/api/health/ready")).status === 200) return
    await sleep(1_000)
  }
  throw new Error(`a API de teste não ficou pronta em ${timeoutMs / 1000} s. Últimas linhas:\n${api.tail()}`)
}

/** Garante `n` alunos criados e com os passos anteriores do exercício do motor concluídos. */
async function ensureStudents(pool: Aluno[], n: number, alvo: AlvoResolvido, apiUrl: string, motor: Motor): Promise<void> {
  while (pool.length < n) {
    const index = pool.length
    pool.push({ index, client: new ApiClient(apiUrl, { forwardedFor: `10.77.${Math.floor(index / 250)}.${(index % 250) + 1}`, timeoutMs: REQUEST_TIMEOUT_MS }), prepared: new Set() })
  }
  const pending = pool.slice(0, n).filter((student) => !student.prepared.has(motor))
  if (pending.length === 0) return
  console.log(`  preparando ${pending.length} aluno(s) para ${motor}…`)
  let cursor = 0
  const worker = async (): Promise<void> => {
    for (let student = pending[cursor++]; student !== undefined; student = pending[cursor++]) {
      if (!student.client.hasSession) await student.client.signUp(newCredentials(`carga${student.index}`))
      await prepararAluno(student.client, alvo)
      student.prepared.add(motor)
    }
  }
  await Promise.all(Array.from({ length: SETUP_CONCURRENCY }, worker))
}

interface Level {
  envios: Envio[]
  p50: number | null
  p95: number | null
  p99: number | null
  max: number | null
  okCount: number
  passed: number
  rejected503: number
  limited429: number
  otherErrors: number
  errorRate: number
  maxInFlight: number
  maxPending: number | null
  maxActive: number | null
  peakPending: number | null
  capacity: number | null
  runnerExecP95: number | null
  runnerQueueP95: number | null
  throughput: number
  startedAt: string
}

async function runLevel(options: { students: Aluno[]; alvo: AlvoResolvido; runner: RunnerClient; duration: number; thinkMin: number; thinkMax: number; pWrong: number; random: () => number; signal: AbortSignal }): Promise<Level> {
  const { students, alvo, runner, duration, thinkMin, thinkMax, pWrong, random, signal } = options
  const startedAt = nowIso()
  const before = await runner.stats()
  const endAt = Date.now() + duration * 1000
  const envios: Envio[] = []
  let inFlight = 0
  let maxInFlight = 0
  let maxPending: number | null = null
  let maxActive: number | null = null
  let lastStats: RunnerStats | null = before

  const poller = (async (): Promise<void> => {
    while (Date.now() < endAt + 1_000 && !signal.aborted) {
      const stats = await runner.stats()
      if (stats !== null) {
        lastStats = stats
        maxPending = Math.max(maxPending ?? 0, stats.pending)
        maxActive = Math.max(maxActive ?? 0, stats.active)
      }
      await sleep(1_000, signal)
    }
  })()

  const virtualUser = async (student: Aluno): Promise<void> => {
    await sleep(randomBetween(0, thinkMax, random) * 1000, signal)
    while (Date.now() < endAt && !signal.aborted) {
      const wrong = alvo.erradas.length > 0 && random() < pWrong
      const files = wrong ? (alvo.erradas[Math.floor(random() * alvo.erradas.length)] ?? alvo.correta) : alvo.correta
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      const response = await student.client.request<SubmitResponse>("POST", submitRoute(alvo), { files })
      inFlight--
      envios.push({ ms: response.ms, status: response.status, passou: response.body?.passed ?? null })
      await sleep(randomBetween(thinkMin, thinkMax, random) * 1000, signal)
    }
  }
  await Promise.all(students.map(virtualUser))
  await poller

  const ok = envios.filter((envio) => envio.status === 200)
  const latencies = ok.map((envio) => envio.ms)
  const after = lastStats as RunnerStats | null
  const since = before?.now ?? 0
  const jobs = after ? after.recent.filter((job) => job.at >= since) : []
  const errors = envios.length - ok.length
  return {
    envios,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies.length === 0 ? null : Math.max(...latencies),
    okCount: ok.length,
    passed: ok.filter((envio) => envio.passou === true).length,
    rejected503: envios.filter((envio) => envio.status === 503).length,
    limited429: envios.filter((envio) => envio.status === 429).length,
    otherErrors: errors - envios.filter((envio) => envio.status === 503 || envio.status === 429).length,
    errorRate: envios.length === 0 ? 1 : errors / envios.length,
    maxInFlight,
    maxPending,
    maxActive,
    peakPending: after?.peakPending ?? null,
    capacity: after?.capacity ?? null,
    runnerExecP95: jobs.length === 0 ? null : percentile(jobs.map((job) => job.execMs), 95),
    runnerQueueP95: jobs.length === 0 ? null : percentile(jobs.map((job) => job.queueMs), 95),
    throughput: envios.length / duration,
    startedAt,
  }
}

/** Motivo da saturação (p95, erro ou nenhum envio concluído), ou `null` se o nível aguentou. */
function judge(level: Level, limitP95: number, limitError: number): string | null {
  if (level.envios.length === 0) return "nenhum envio concluído"
  const reasons: string[] = []
  if (level.p95 === null) reasons.push("nenhuma resposta 200")
  else if (level.p95 > limitP95) reasons.push(`p95 ${Math.round(level.p95)} ms > ${limitP95} ms`)
  if (level.errorRate > limitError) reasons.push(`erro ${(level.errorRate * 100).toFixed(1)}% > ${limitError * 100}%`)
  return reasons.length === 0 ? null : reasons.join("; ")
}

function rowOf(motor: Motor, alvo: AlvoResolvido, n: number, duration: number, thinkMin: number, thinkMax: number, level: Level, saturation: string | null): (string | number | boolean | null)[] {
  return [
    motor, alvo.perfil, n, duration, thinkMin, thinkMax, level.envios.length, level.okCount, level.passed, level.rejected503, level.limited429, level.otherErrors, round(level.errorRate, 4),
    round(level.p50), round(level.p95), round(level.p99), round(level.max), level.runnerExecP95, level.runnerQueueP95, level.maxPending, level.maxActive, level.peakPending, level.capacity,
    level.maxInFlight, round(level.throughput, 3), saturation !== null, saturation, level.startedAt,
  ]
}

/** Espera o executor esvaziar (fila e ativos em zero) para um nível não herdar a fila do anterior. */
async function cooldown(runner: RunnerClient, signal: AbortSignal): Promise<void> {
  const deadline = Date.now() + 180_000
  let quiet = 0
  const probe = await runner.stats()
  if (probe === null) return void (await sleep(20_000, signal))
  while (Date.now() < deadline && quiet < 3 && !signal.aborted) {
    const stats = await runner.stats()
    quiet = stats !== null && stats.active === 0 && stats.pending === 0 ? quiet + 1 : 0
    await sleep(1_000, signal)
  }
  await sleep(5_000, signal)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
