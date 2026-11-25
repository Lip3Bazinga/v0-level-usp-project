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
 * Saída (em --dir-dados, padrão docs/tcc/dados): carga.csv (uma linha por motor × N), carga-saturacao.csv, amostras de
 * CPU/memória em recursos.csv (tipo `carga`) e uma rodada nova na seção "carga" de ambiente.json. Rodada
 * parcial (ex.: --motores ml) troca só as linhas do motor × N medido; o resumo de saturação sai do CSV completo.
 */
import path from "node:path"
import { ApiClient, newCredentials } from "./lib/api.mts"
import { flagOption, listOption, numberOption, parseArgs, rangeOption, rejectUnknown, stringOption } from "./lib/args.mts"
import { type AlvoResolvido, ALVOS_CARGA, loadBundle, type Motor, prepararAluno, resolverAlvo, submitRoute, type SubmitResponse } from "./lib/conteudo.mts"
import { cleanBenchResidue, dockerAvailable } from "./lib/docker.mts"
import { dirDados, mergeCsv, registerRound, writeDerivedCsv } from "./lib/dados.mts"
import { formatTable, percentile, readCsv, round } from "./lib/estatistica.mts"
import { memoriaUsadaMb, politicaDoPerfil, readExecutorConfig } from "./lib/executor.mts"
import { iniciarPilha, Limpeza } from "./lib/pilha.mts"
import { mergeRecursos, recursosFile, startSampler } from "./lib/recursos.mts"
import { resumoSaturacao, SATURACAO_HEADER } from "./lib/resumos.mts"
import { RunnerClient, requireRunnerToken, type RunnerStats } from "./lib/runner.mts"
import { collectEnvironment, DEFAULT_BUNDLE, nowIso, randomBetween, seededRandom, sleep } from "./lib/sistema.mts"

const KNOWN_OPTIONS = ["motores", "niveis", "duracao-s", "pensar-s", "runner-url", "api-porta", "p-errado", "limite-p95-ms", "limite-erro", "min-erros", "min-amostras-p95", "semente", "dir-dados", "conteiner", "sem-recursos", "pacote", "parar-na-saturacao", "limpar", "ajuda"]
const CSV_HEADER = [
  "motor", "perfil", "usuarios", "duracao_s", "pensar_min_s", "pensar_max_s", "envios", "ok_200", "aprovados", "rejeitados_503", "limitados_429", "outros_erros", "taxa_erro",
  "p50_ms", "p95_ms", "p99_ms", "max_ms", "runner_exec_p95_ms", "runner_fila_p95_ms", "fila_max_runner", "ativos_max_runner", "pico_fila_runner", "capacidade_runner",
  "emvoo_max_cliente", "vazao_envios_s", "duracao_real_s", "saturou", "motivo_saturacao", "regra_saturacao", "inicio",
  // Colunas acrescentadas na Fase D2 (sempre no fim): memória reservada no executor e dados para recalcular a saturação.
  "memoria_reservada_pico_mib", "politica_pyodide", "limite_p95_ms", "limite_erro",
] as const
/** Chave de substituição no CSV: uma rodada regrava só o motor × N medido agora. */
const chaveCarga = (linha: Record<string, string>): string => `${linha.motor}|${linha.usuarios}`
const REQUEST_TIMEOUT_MS = 60_000
const SETUP_CONCURRENCY = 4
/** Teto da API: 150 verificações por aluno e lição por dia (`codeSubmissionPerLessonDay`). */
const DAILY_SUBMISSIONS_PER_LESSON = 150

/** Regras que decidem a saturação de um nível. */
interface Rule {
  limitP95: number
  limitError: number
  /** Erros mínimos (além da taxa) para declarar saturação por erro: 1 erro em 67 envios não é saturação. */
  minErrors: number
  /** Respostas 200 mínimas para o p95 valer. */
  minSamplesP95: number
}

/** Texto da regra, gravado em cada linha do CSV. */
function describeRule(rule: Rule): string {
  return `p95 das respostas 200 > ${rule.limitP95} ms (com ao menos ${rule.minSamplesP95} respostas 200); OU taxa de erro > ${rule.limitError * 100}% E ao menos ${rule.minErrors} erros. Erro = 503, timeout, rede e 5xx; 429 (limite por usuário) é contado à parte e não satura`
}

const HELP = `Uso: node scripts/bench/carga.mts [opções]
  --motores python,dados,ml   motores medidos (padrão: os três)
  --niveis 10,25,50,100       alunos simultâneos (padrão 10,25,50,100)
  --duracao-s N               duração de cada nível (padrão 300)
  --pensar-s 30-60            tempo de pensar entre envios, sorteado (padrão 30-60)
  --p-errado 0.4              fração de envios com solução errada do pacote (padrão 0.4)
  --limite-p95-ms 10000       p95 acima disto = saturado (padrão 10000)
  --limite-erro 0.01          taxa de erro acima disto = saturado (padrão 0.01) ...
  --min-erros 3               ... desde que haja ao menos N erros (padrão 3)
  --min-amostras-p95 20       respostas 200 mínimas para o p95 valer (padrão 20)
  --parar-na-saturacao        não roda os níveis maiores do motor depois de saturar
  --runner-url URL            executor (padrão $RUNNER_URL ou http://localhost:8081); token em $RUNNER_TOKEN
  --api-porta N               porta da API de teste (padrão: uma livre sorteada; se pedida e ocupada, aborta)
  --conteiner REGEX           contêineres amostrados (padrão "runner|levelusp-bench-"); --sem-recursos desliga
  --semente N                 semente dos sorteios (repetível)
  --dir-dados PASTA           pasta de saída (padrão docs/tcc/dados): carga.csv, carga-saturacao.csv, recursos.csv e ambiente.json.
                              Rodada parcial troca só as linhas do motor × N medido; carga-saturacao.csv é recalculado do carga.csv completo
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
  const rule: Rule = { limitP95, limitError, minErrors: numberOption(args, "min-erros", 3), minSamplesP95: numberOption(args, "min-amostras-p95", 20) }
  const apiPort = args.options.has("api-porta") ? numberOption(args, "api-porta", 0) : undefined
  const random = seededRandom(numberOption(args, "semente", Date.now() % 1_000_000))
  const dir = dirDados(args)
  const csvFile = path.join(dir, "carga.csv")
  const saturationFile = path.join(dir, "carga-saturacao.csv")
  const recursosCsv = recursosFile(dir)
  const containerPattern = new RegExp(stringOption(args, "conteiner", "runner|levelusp-bench-"))
  const sampleResources = !flagOption(args, "sem-recursos")
  const stopAtSaturation = flagOption(args, "parar-na-saturacao")
  const runnerUrl = stringOption(args, "runner-url", process.env.RUNNER_URL ?? "http://localhost:8081")
  const token = requireRunnerToken()
  const bundleFile = path.resolve(stringOption(args, "pacote", DEFAULT_BUNDLE))
  if (niveis.some((level) => !Number.isInteger(level) || level < 1)) throw new Error("--niveis precisa de inteiros positivos")

  const runner = new RunnerClient(runnerUrl, token)
  if (!(await runner.health()).ok) throw new Error(`executor sem resposta em ${runnerUrl}/healthz`)
  const initial = await runner.stats()
  if (initial === null) console.warn("AVISO: /v1/stats indisponível: fila do executor será derivada no cliente.")
  const configInicial = await readExecutorConfig(runner)
  if (configInicial.memory === null) console.warn("AVISO: o executor não informa `memory` em /v1/stats: as colunas de memória reservada ficam vazias.")
  console.log(`Executor: política Pyodide ${JSON.stringify(configInicial.politica_pyodide)}, capacidade ${configInicial.capacity ?? "?"}, pool aquecido ${JSON.stringify(configInicial.pool_aquecido)}.`)
  const estimateMin = Math.round((motores.length * niveis.length * (duration + 40)) / 60)
  console.log(`Plano: motores ${motores.join(",")}; níveis ${niveis.join(",")}; ${duration} s cada (≈ ${estimateMin} min + preparação).`)

  // Um aluno participa de vários níveis: o teto diário (150 por aluno e lição) não pode virar "saturação".
  const perStudent = niveis.length * (Math.ceil(duration / thinkMin) + 1)
  if (perStudent > DAILY_SUBMISSIONS_PER_LESSON * 0.8) {
    console.warn(`AVISO: cada aluno pode enviar até ~${perStudent} vezes à mesma lição (teto da API: ${DAILY_SUBMISSIONS_PER_LESSON}/dia): reduza --duracao-s ou --niveis; respostas 429 não contam como saturação, mas distorcem o nível.`)
  }
  if (path.resolve(bundleFile) !== path.resolve(DEFAULT_BUNDLE)) console.warn("AVISO: --pacote diferente do padrão: o seed importa os pacotes de packages/db/seed/*.json; esse arquivo só define os exercícios e soluções usados.")

  const limpeza = new Limpeza()
  limpeza.installSignals()
  const abort = limpeza.abort

  try {
    console.log("\n[1/2] pilha descartável…")
    const { apiUrl } = await iniciarPilha({ runnerUrl, token, port: apiPort, limpeza })

    console.log("[2/2] resolvendo exercícios e rodando os níveis…")
    const bundle = loadBundle(bundleFile)
    const admin = new ApiClient(apiUrl, { forwardedFor: "10.250.0.1" })
    const alvos = new Map<Motor, AlvoResolvido>()
    for (const motor of motores) {
      const alvo = ALVOS_CARGA[motor]
      alvos.set(motor, await resolverAlvo(admin, bundle, alvo))
      console.log(`  ${motor}: ${alvo.descricao} (${alvo.licao}, passo ${alvo.passo})`)
    }

    const pool: Aluno[] = []
    const summary: (string | number | null)[][] = []
    let noContainerWarned = false

    for (const motor of motores) {
      const alvo = alvos.get(motor)
      if (!alvo) continue
      let saturatedAt: { n: number; reason: string } | null = null
      for (const n of niveis) {
        if (abort.signal.aborted) break
        if (saturatedAt !== null && stopAtSaturation) break
        console.log(`\n== ${motor}, ${n} alunos, ${duration} s ==`)
        await ensureStudents(pool, n, alvo, apiUrl, motor)
        const sampler = sampleResources ? startSampler({ tipo: "carga", rotulo: `carga-${motor}-n${n}`, motor, k: n }, containerPattern, 4_000) : null
        const level = await runLevel({ students: pool.slice(0, n), alvo, runner, duration, thinkMin, thinkMax, pWrong, random, signal: abort.signal })
        const amostragem = sampler ? await sampler.stop() : null
        const samples = amostragem?.samples ?? []
        if (amostragem) mergeRecursos(recursosCsv, amostragem.rows)
        if (sampler && !noContainerWarned && !samples.some((sample) => /runner/.test(sample.container))) {
          noContainerWarned = true
          console.warn("AVISO: nenhum contêiner 'runner' foi amostrado (executor fora do Docker?): CPU/memória do executor não foram registradas.")
        }
        const saturation = judge(level, rule)
        if (saturation !== null && saturatedAt === null) saturatedAt = { n, reason: saturation }
        if (level.limited429 > 0) console.warn(`  AVISO: ${level.limited429} resposta(s) 429 (limite por usuário/dia ou por minuto): não contam como saturação do executor.`)
        mergeCsv(csvFile, CSV_HEADER, chaveCarga, [rowOf(motor, alvo, n, duration, thinkMin, thinkMax, level, saturation, describeRule(rule), politicaDoPerfil(configInicial, alvo.perfil), rule)])
        writeDerivedCsv(saturationFile, SATURACAO_HEADER, resumoSaturacao(readCsv(csvFile)))
        summary.push([motor, n, level.envios.length, round(level.p95), `${round(level.errorRate * 100)}%`, level.maxPending, level.maxInFlight, saturation ?? "ok"])
        console.log(`  envios ${level.envios.length}, p95 ${round(level.p95, 0) ?? "-"} ms, erro ${round(level.errorRate * 100)}%, fila máx ${level.maxPending ?? "?"}, ${saturation ?? "sem saturação"}`)
        await cooldown(runner, abort.signal)
      }
    }
    console.log("\nResumo:")
    console.log(formatTable(["motor", "N", "envios", "p95_ms", "erro", "fila_max", "emvoo_max", "veredito"], summary))
    console.log("\nSaturação:")
    console.log(formatTable(SATURACAO_HEADER, resumoSaturacao(readCsv(csvFile))))

    const configFinal = await readExecutorConfig(runner)
    registerRound(dir, "carga", {
      ...(await collectEnvironment()),
      motores,
      niveis,
      executor: { url: runnerUrl, inicio: configInicial, fim: configFinal, healthz: (await runner.health()).body },
      banco: "PostgreSQL 17 (postgres:17-alpine) em volume Docker descartável, configuração padrão da imagem",
      api: { node: process.version, pool_conexoes: "padrão (10)", log: "warn" },
      parametros: { motores, niveis, duracao_s: duration, pensar_s: [thinkMin, thinkMax], p_errado: pWrong, regra_saturacao: describeRule(rule), alvos: Object.fromEntries([...alvos].map(([motor, alvo]) => [motor, `${alvo.alvo.licao}#${alvo.alvo.passo}`])) },
      gerador: "mesma máquina da API e do banco: divide a CPU com o sistema medido",
    })
  } finally {
    await limpeza.run()
  }
}

function asMotor(value: string): Motor {
  if (value === "python" || value === "dados" || value === "ml") return value
  throw new Error(`motor desconhecido: ${value} (use python, dados ou ml)`)
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
  /** Maior memória reservada (`memory.usedMb`) vista no executor durante o nível; `null` se o executor não informa. */
  maxMemoryMb: number | null
  peakPending: number | null
  capacity: number | null
  runnerExecP95: number | null
  runnerQueueP95: number | null
  throughput: number
  startedAt: string
  /** Erros que contam para a saturação (503, timeout, rede, 5xx); sem os 429. */
  errorCount: number
  /** Do início do nível até o último envio terminar (pode passar de `duracao-s` quando há envios lentos). */
  actualSeconds: number
}

async function runLevel(options: { students: Aluno[]; alvo: AlvoResolvido; runner: RunnerClient; duration: number; thinkMin: number; thinkMax: number; pWrong: number; random: () => number; signal: AbortSignal }): Promise<Level> {
  const { students, alvo, runner, duration, thinkMin, thinkMax, pWrong, random, signal } = options
  const startedAt = nowIso()
  const before = await runner.stats()
  const levelStartedMs = Date.now()
  const endAt = levelStartedMs + duration * 1000
  const envios: Envio[] = []
  let inFlight = 0
  let maxInFlight = 0
  let maxPending: number | null = null
  let maxActive: number | null = null
  let maxMemoryMb: number | null = null
  let lastStats: RunnerStats | null = before
  let lastDoneMs = levelStartedMs

  const poller = (async (): Promise<void> => {
    while (Date.now() < endAt + 1_000 && !signal.aborted) {
      const stats = await runner.stats()
      if (stats !== null) {
        lastStats = stats
        maxPending = Math.max(maxPending ?? 0, stats.pending)
        maxActive = Math.max(maxActive ?? 0, stats.active)
        const used = memoriaUsadaMb(stats)
        if (used !== null) maxMemoryMb = Math.max(maxMemoryMb ?? 0, used)
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
      lastDoneMs = Date.now()
      const think = randomBetween(thinkMin, thinkMax, random) * 1000
      if (Date.now() + think >= endAt) break
      await sleep(think, signal)
    }
  }
  await Promise.all(students.map(virtualUser))
  await poller

  const ok = envios.filter((envio) => envio.status === 200)
  const latencies = ok.map((envio) => envio.ms)
  const after = lastStats as RunnerStats | null
  const since = before?.now ?? 0
  const jobs = after ? after.recent.filter((job) => job.at >= since) : []
  const limited429 = envios.filter((envio) => envio.status === 429).length
  const rejected503 = envios.filter((envio) => envio.status === 503).length
  // 429 (limite por usuário) não é falha do executor: fica fora do erro e do denominador.
  const errors = envios.length - ok.length - limited429
  const considered = envios.length - limited429
  // Duração real: do início ao último envio concluído (a espera final de pensar não conta).
  const actualSeconds = Math.max(1, (lastDoneMs - levelStartedMs) / 1000)
  return {
    errorCount: errors,
    actualSeconds,
    envios,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    max: latencies.length === 0 ? null : Math.max(...latencies),
    okCount: ok.length,
    passed: ok.filter((envio) => envio.passou === true).length,
    rejected503,
    limited429,
    otherErrors: errors - rejected503,
    errorRate: considered === 0 ? 0 : errors / considered,
    maxInFlight,
    maxPending,
    maxActive,
    maxMemoryMb,
    peakPending: after?.peakPending ?? null,
    capacity: after?.capacity ?? null,
    runnerExecP95: jobs.length === 0 ? null : percentile(jobs.map((job) => job.execMs), 95),
    runnerQueueP95: jobs.length === 0 ? null : percentile(jobs.map((job) => job.queueMs), 95),
    throughput: envios.length / actualSeconds,
    startedAt,
  }
}

/**
 * Motivo da saturação, ou `null` se o nível aguentou. O p95 só vale com amostras suficientes e a
 * taxa de erro só satura com um mínimo de erros absolutos (um erro isolado em N=10 passa de 1%).
 */
function judge(level: Level, rule: Rule): string | null {
  if (level.envios.length === 0) return "nenhum envio concluído"
  const reasons: string[] = []
  if (level.okCount === 0) reasons.push("nenhuma resposta 200")
  else if (level.okCount >= rule.minSamplesP95 && level.p95 !== null && level.p95 > rule.limitP95) reasons.push(`p95 ${Math.round(level.p95)} ms > ${rule.limitP95} ms`)
  if (level.errorRate > rule.limitError && level.errorCount >= rule.minErrors) reasons.push(`erro ${(level.errorRate * 100).toFixed(1)}% (${level.errorCount} erros) > ${rule.limitError * 100}%`)
  return reasons.length === 0 ? null : reasons.join("; ")
}

function rowOf(motor: Motor, alvo: AlvoResolvido, n: number, duration: number, thinkMin: number, thinkMax: number, level: Level, saturation: string | null, ruleText: string, politica: string | null, rule: Rule): (string | number | boolean | null)[] {
  return [
    motor, alvo.perfil, n, duration, thinkMin, thinkMax, level.envios.length, level.okCount, level.passed, level.rejected503, level.limited429, level.otherErrors, round(level.errorRate, 4),
    round(level.p50), round(level.p95), round(level.p99), round(level.max), level.runnerExecP95, level.runnerQueueP95, level.maxPending, level.maxActive, level.peakPending, level.capacity,
    level.maxInFlight, round(level.throughput, 3), round(level.actualSeconds), saturation !== null, saturation, ruleText, level.startedAt,
    round(level.maxMemoryMb), politica, rule.limitP95, rule.limitError,
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
