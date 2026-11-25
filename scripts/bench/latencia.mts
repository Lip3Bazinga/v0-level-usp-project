/**
 * Latência por motor, a frio e a quente, separando o tempo do executor do tempo total da API.
 *
 *   node scripts/bench/latencia.mts [--repeticoes 30] [--cmd-reinicio "<comando>"] …
 *
 * Cenários (spec da Fase D): a) lote trivial, b) exercício típico do N1, c) pandas do N4,
 * d) scikit-learn do N5, e) treino numpy do N6 — todos como o aluno faz: cadastro, passos
 * anteriores concluídos e `POST /me/lessons/:id/steps/:stepId/submit` com a solução correta do
 * pacote. Mais três cenários "piso" direto no executor (`/v1/run`), que isolam o custo do
 * motor sem a API.
 *
 * Tempo do executor: a API não devolve a duração no passo, então ela vem do `GET /v1/stats` do
 * executor (campos `queueMs` e `execMs` do job que acabou de terminar). Só vale com o executor
 * ocioso (o script lê o job mais novo depois de cada envio e marca `ruido=1` se houver mais de um).
 *
 * Saída (em --dir-dados, padrão docs/tcc/dados): latencia.csv (uma linha por execução),
 * latencia-resumo.csv (p50/p95/p99, recalculado do CSV completo) e uma rodada nova na seção
 * "latencia" de ambiente.json. Rodada parcial (--motores, --cenarios) troca só as linhas dos cenários
 * medidos agora e preserva as demais. Leia scripts/bench/README.md antes de rodar.
 */
import path from "node:path"
import { ApiClient, newCredentials } from "./lib/api.mts"
import { flagOption, listOption, numberOption, optionalStringOption, parseArgs, rejectUnknown, stringOption } from "./lib/args.mts"
import { ALVOS_LATENCIA, type AlvoResolvido, loadBundle, prepararAluno, resolverAlvo, submitRoute, type SubmitResponse } from "./lib/conteudo.mts"
import { dirDados, mergeCsv, registerRound, writeDerivedCsv } from "./lib/dados.mts"
import { formatTable, readCsv, round } from "./lib/estatistica.mts"
import { type ConfigExecutor, type PerfilPyodide, politicaDoPerfil, readExecutorConfig } from "./lib/executor.mts"
import { LATENCIA_RESUMO_HEADER, resumoLatencia } from "./lib/resumos.mts"
import { dockerAvailable } from "./lib/docker.mts"
import { iniciarPilha, Limpeza } from "./lib/pilha.mts"
import { type DirectJob, jobsAfter, lastJobAt, RunnerClient, requireRunnerToken, warmWorkers } from "./lib/runner.mts"
import { collectEnvironment, DEFAULT_BUNDLE, nowIso, runShell, sleep } from "./lib/sistema.mts"

const KNOWN_OPTIONS = ["api", "api-porta", "runner-url", "repeticoes", "repeticoes-frio", "usuarios", "pacote", "dir-dados", "cmd-reinicio", "espera-pool-s", "cenarios", "motores", "descarte", "ajuda"]
/** Limite do aluno: 12 verificações por minuto → pelo menos 5 s entre dois envios do mesmo aluno. */
const MIN_GAP_PER_USER_MS = 5_500
const CSV_HEADER = ["cenario", "via", "descricao", "motor", "condicao", "repeticao", "total_ms", "runner_exec_ms", "runner_fila_ms", "lotes", "sobrecarga_ms", "pool_quente_antes", "passou", "status", "ruido", "inicio", "politica_pyodide"] as const
/** Chave de substituição no CSV: uma rodada regrava só os cenários medidos agora. */
const chaveLatencia = (linha: Record<string, string>): string => linha.cenario ?? ""

type Condicao = "quente" | "frio_pool" | "frio_processo"

interface Medida {
  cenario: string
  via: "api" | "runner_direto"
  descricao: string
  motor: string
  condicao: Condicao
  repeticao: number
  totalMs: number
  execMs: number | null
  filaMs: number | null
  lotes: number | null
  sobrecargaMs: number | null
  poolAntes: number | null
  passou: boolean | null
  status: number
  ruido: boolean
  inicio: string
  /** Política do Pyodide que o executor informava ao medir (`null` no motor WASI ou sem informação). */
  politica: string | null
}

/** Um cenário medível: `executar` faz UMA execução e devolve a medida (sem a condição, que é decidida depois). */
interface Cenario {
  chave: string
  via: "api" | "runner_direto"
  descricao: string
  motor: string
  perfil: "dados" | "ml" | null
  executar: (condicao: Condicao, repeticao: number) => Promise<Medida>
}

/** Limpeza da pilha descartável (roda também quando o script falha ou recebe Ctrl+C). */
const limpeza = new Limpeza()

const HELP = `Uso: node scripts/bench/latencia.mts [opções]
  (padrão)                sobe um banco DESCARTÁVEL (levelusp-bench-*) + API de teste, como carga.mts, e apaga tudo no fim
  --api-porta N           porta da API de teste (padrão: uma livre; se pedida e ocupada, aborta)
  --api URL               usa uma API JÁ EM EXECUÇÃO em vez da descartável (ex.: dev). Deixa contas bench.*@bench.invalid
                          e progresso nesse banco: use só se souber o que está fazendo
  --runner-url URL        executor (padrão $RUNNER_URL ou http://localhost:8081); token em $RUNNER_TOKEN
  --repeticoes N          execuções quentes por cenário (padrão 30)
  --repeticoes-frio N     execuções a frio por cenário (padrão = --repeticoes)
  --usuarios N            alunos virtuais em rodízio, por causa do limite de 12 envios/min (padrão 4)
  --cenarios a,b,c,d,e,piso-python,piso-dados,piso-ml   subconjunto (padrão: todos)
  --motores python,dados,ml   só os cenários desses motores (padrão: todos); combina com --cenarios (interseção).
                          A condição quente/frio do ml sai do que o executor informa (pool aquecido e política: com reuse
                          há cenário quente do ml); a política que valia fica na coluna politica_pyodide
  --cmd-reinicio "CMD"    reinicia o executor antes de cada execução a frio de processo
  --espera-pool-s N       quanto esperar um worker Pyodide aquecido (padrão 120)
  --descarte N            execuções de aquecimento descartadas por cenário (padrão 1)
  --pacote ARQUIVO        pacote de conteúdo (padrão packages/db/seed/trilha-python-ia.json)
  --dir-dados PASTA       pasta de saída (padrão docs/tcc/dados): latencia.csv, latencia-resumo.csv e ambiente.json.
                          Rodada parcial troca só as linhas dos cenários medidos e preserva as demais`

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (flagOption(args, "ajuda")) return void console.log(HELP)
  rejectUnknown(args, KNOWN_OPTIONS)

  const externalApi = optionalStringOption(args, "api")
  const runnerUrl = stringOption(args, "runner-url", process.env.RUNNER_URL ?? "http://localhost:8081")
  const repeticoes = Math.max(1, Math.trunc(numberOption(args, "repeticoes", 30)))
  const repeticoesFrio = Math.max(1, Math.trunc(numberOption(args, "repeticoes-frio", repeticoes)))
  const usuarios = Math.max(1, Math.trunc(numberOption(args, "usuarios", 4)))
  const descarte = Math.max(0, Math.trunc(numberOption(args, "descarte", 1)))
  const esperaPoolMs = numberOption(args, "espera-pool-s", 120) * 1000
  const restartCommand = optionalStringOption(args, "cmd-reinicio")
  const dir = dirDados(args)
  const csvFile = path.join(dir, "latencia.csv")
  const bundleFile = path.resolve(stringOption(args, "pacote", DEFAULT_BUNDLE))
  const motoresPedidos = listOption(args, "motores", ["python", "dados", "ml"])
  const motoresInvalidos = motoresPedidos.filter((motor) => !["python", "dados", "ml"].includes(motor))
  if (motoresInvalidos.length > 0) throw new Error(`--motores inválido: ${motoresInvalidos.join(", ")} (use python, dados, ml)`)
  const wanted = listOption(args, "cenarios", [...ALVOS_LATENCIA.map((alvo) => alvo.chave), "piso-python", "piso-dados", "piso-ml"]).filter((chave) => motoresPedidos.includes(motorDoCenario(chave)))
  if (wanted.length === 0) throw new Error("nenhum cenário restou depois de combinar --cenarios e --motores")

  const token = requireRunnerToken()
  const runner = new RunnerClient(runnerUrl, token)
  const health = await runner.health()
  if (!health.ok) throw new Error(`executor sem resposta em ${runnerUrl}/healthz`)
  const initialStats = await runner.stats()
  if (initialStats === null) console.warn("AVISO: /v1/stats indisponível: o tempo do executor ficará em branco (use um executor com a rota e o RUNNER_TOKEN certo).")
  if (initialStats !== null && (initialStats.active > 0 || initialStats.pending > 0)) console.warn("AVISO: o executor não está ocioso (há jobs ativos); as medições terão ruído.")

  let apiUrl: string
  if (externalApi !== undefined) {
    console.warn(`AVISO: usando a API em ${externalApi}: as contas bench.*@bench.invalid e o progresso criados ficam no banco dela.`)
    apiUrl = externalApi
    const ready = await new ApiClient(apiUrl).request("GET", "/api/health/ready")
    if (ready.status !== 200) throw new Error(`API fora do ar ou sem executor em ${apiUrl}/api/health/ready (${ready.status})`)
  } else {
    if (!(await dockerAvailable())) throw new Error("o Docker não responde (necessário para o banco descartável; ou use --api URL)")
    limpeza.installSignals()
    console.log("\nPilha descartável (banco levelusp-bench-* + API de teste)…")
    apiUrl = (await iniciarPilha({ runnerUrl, token, port: args.options.has("api-porta") ? numberOption(args, "api-porta", 0) : undefined, limpeza })).apiUrl
  }

  const configInicial = await readExecutorConfig(runner)
  console.log(`Executor: política Pyodide ${JSON.stringify(configInicial.politica_pyodide)}, capacidade ${configInicial.capacity ?? "?"}, pool aquecido ${JSON.stringify(configInicial.pool_aquecido)}.`)
  let medidas: Medida[] = []
  const record = (bruta: Medida): void => {
    const medida: Medida = { ...bruta, politica: politicaDoPerfil(configInicial, perfilDoMotor(bruta.motor)) }
    medidas.push(medida)
    process.stdout.write(`  ${medida.cenario} ${medida.condicao} #${medida.repeticao}: total ${round(medida.totalMs, 0)} ms, executor ${medida.execMs ?? "-"} ms${medida.passou === false ? " (NÃO PASSOU)" : ""}\n`)
  }

  const bundle = loadBundle(bundleFile)
  const failures: string[] = []
  const measuredScenarios: string[] = []
  const engineVersions: Record<string, unknown> = {}
  const context: Context = { config: configInicial, runner, esperaPoolMs, restartCommand, repeticoes, repeticoesFrio, descarte, record, poolOff: new Set() }

  for (const chave of wanted) {
    try {
      console.log(`\n== cenário ${chave} ==`)
      const cenario = chave.startsWith("piso-")
        ? pisoScenario(chave, runner, engineVersions)
        : await apiScenario(chave, { apiUrl, runner, bundle, usuarios })
      medidas = []
      await medirCenario(cenario, context)
      const merged = mergeCsv(csvFile, CSV_HEADER, chaveLatencia, medidas.map(rowOf))
      console.log(`  latencia.csv: ${merged.substituidas} linha(s) antiga(s) deste cenário substituída(s); ${merged.preservadas} de outros cenários preservada(s)`)
      measuredScenarios.push(chave)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`FALHA no cenário ${chave}: ${message}`)
      failures.push(`${chave}: ${message}`)
    }
  }

  summarizeAndSave(csvFile)
  const finalHealth = await runner.health()
  registerRound(dir, "latencia", {
    ...(await collectEnvironment()),
    motores: motoresPedidos,
    cenarios_medidos: measuredScenarios,
    api: externalApi === undefined ? "API de teste local com PostgreSQL 17 descartável (levelusp-bench-*)" : `API externa (${externalApi}): contas bench.* ficaram no banco dela`,
    executor: { url: runnerUrl, inicio: configInicial, fim: await readExecutorConfig(runner), healthz: finalHealth.body, motores: engineVersions },
    pacote: path.relative(process.cwd(), bundleFile),
    parametros: { repeticoes, repeticoes_frio: repeticoesFrio, usuarios, descarte, cmd_reinicio: restartCommand !== undefined, cenarios: wanted, percentil: "posto mais próximo (nearest-rank)" },
    falhas: failures,
  })
  if (failures.length > 0) {
    console.error(`\n${failures.length} cenário(s) com falha:\n- ${failures.join("\n- ")}`)
    process.exitCode = 1
  }
}

interface Context {
  config: ConfigExecutor
  runner: RunnerClient
  esperaPoolMs: number
  restartCommand: string | undefined
  repeticoes: number
  repeticoesFrio: number
  descarte: number
  record: (medida: Medida) => void
  /** Perfis Pyodide que nunca ficam aquecidos neste executor (`RUNNER_PYODIDE_WARM=…,ml:0`). */
  poolOff: Set<string>
}

/** Executa as fases de um cenário conforme o motor e a existência de `--cmd-reinicio`. */
async function medirCenario(cenario: Cenario, context: Context): Promise<void> {
  const { descarte, repeticoes, repeticoesFrio, restartCommand, record } = context
  for (let index = 0; index < descarte; index++) {
    if (cenario.perfil !== null) await waitPool(context, cenario.perfil)
    await cenario.executar("quente", 0)
  }
  const warm = async (repeticao: number): Promise<void> => {
    if (cenario.perfil !== null) await waitPool(context, cenario.perfil)
    record(await cenario.executar("quente", repeticao))
  }

  if (restartCommand !== undefined) {
    console.log(`  fase quente (${repeticoes}x)`)
    for (let index = 1; index <= repeticoes; index++) await warm(index)
    console.log(`  fase fria de processo (${repeticoesFrio}x, reiniciando o executor a cada execução)`)
    for (let index = 1; index <= repeticoesFrio; index++) {
      const code = await runShell(restartCommand)
      if (code !== 0) throw new Error(`o comando de reinício terminou com código ${code}`)
      if (!(await context.runner.waitHealthy(180_000))) throw new Error("o executor não voltou a responder em /healthz depois do reinício")
      await sleep(500)
      record(await cenario.executar("frio_processo", index))
    }
    return
  }
  if (cenario.perfil === null) {
    console.log(`  fase quente (${repeticoes}x). O frio do motor WASI só é medido com --cmd-reinicio.`)
    for (let index = 1; index <= repeticoes; index++) await warm(index)
    return
  }
  // Política `reuse`: o worker volta ao pool depois do lote, então há medida quente do perfil e o par quente + frio
  // não faz sentido. A condição de cada linha continua sendo a observada no pool (`pool_quente_antes`).
  if (politicaDoPerfil(context.config, cenario.perfil) === "reuse") {
    console.log(`  política reuse no perfil ${cenario.perfil}: execuções em sequência, condição pelo pool observado (${repeticoes}x)`)
    for (let index = 1; index <= repeticoes; index++) await warm(index)
    return
  }
  // Pyodide sem reinício: o worker aquecido é consumido por um envio; o seguinte, logo depois, acha o pool vazio.
  if ((await waitPool(context, cenario.perfil)) !== "ok") {
    console.log(`  perfil ${cenario.perfil} sem worker aquecido: todas as execuções são frias de pool (${repeticoes}x)`)
    for (let index = 1; index <= repeticoes; index++) record(await cenario.executar("frio_pool", index))
    return
  }
  console.log(`  pares quente + frio de pool (${repeticoes}x)`)
  for (let index = 1; index <= repeticoes; index++) {
    await waitPool(context, cenario.perfil)
    record(await cenario.executar("quente", index))
    record(await cenario.executar("frio_pool", index))
  }
}

/** Espera um worker Pyodide do perfil ficar pronto. `sem-stats`/`desligado` quando não dá para esperar. */
async function waitPool(context: Context, profile: "dados" | "ml"): Promise<"ok" | "desligado" | "sem-stats"> {
  if (context.poolOff.has(profile)) return "desligado"
  const deadline = Date.now() + context.esperaPoolMs
  while (Date.now() < deadline) {
    const stats = await context.runner.stats()
    const warm = warmWorkers(stats, profile)
    if (warm === null) return "sem-stats"
    if (warm >= 1) return "ok"
    await sleep(500)
  }
  context.poolOff.add(profile)
  return "desligado"
}

/** Cenário via API: cria alunos, conclui os passos anteriores e envia a solução correta do exercício. */
async function apiScenario(chave: string, options: { apiUrl: string; runner: RunnerClient; bundle: ReturnType<typeof loadBundle>; usuarios: number }): Promise<Cenario> {
  const alvo = ALVOS_LATENCIA.find((candidate) => candidate.chave === chave)
  if (!alvo) throw new Error(`cenário desconhecido: ${chave}`)
  const probe = new ApiClient(options.apiUrl)
  const resolvido = await resolverAlvo(probe, options.bundle, alvo)
  console.log(`  ${alvo.descricao} → lição ${alvo.licao}, passo ${alvo.passo}`)

  const alunos: { client: ApiClient; lastAt: number }[] = []
  for (let index = 0; index < options.usuarios; index++) {
    const client = new ApiClient(options.apiUrl)
    await client.signUp(newCredentials(`lat${chave}${index}`))
    await prepararAluno(client, resolvido)
    alunos.push({ client, lastAt: 0 })
  }
  let next = 0
  return {
    chave,
    via: "api",
    descricao: alvo.descricao,
    motor: alvo.motor,
    perfil: resolvido.perfil,
    executar: async (condicao, repeticao) => {
      const aluno = alunos[next++ % alunos.length]
      if (!aluno) throw new Error("sem alunos virtuais")
      const wait = aluno.lastAt + MIN_GAP_PER_USER_MS - Date.now()
      if (wait > 0) await sleep(wait)
      return enviar(chave, resolvido, aluno, options.runner, condicao, repeticao)
    },
  }
}

async function enviar(chave: string, alvo: AlvoResolvido, aluno: { client: ApiClient; lastAt: number }, runner: RunnerClient, condicao: Condicao, repeticao: number): Promise<Medida> {
  const before = await runner.stats()
  const beforeAt = lastJobAt(before)
  const poolAntes = alvo.perfil !== null ? warmWorkers(before, alvo.perfil) : null
  const inicio = nowIso()
  aluno.lastAt = Date.now()
  const response = await aluno.client.request<SubmitResponse>("POST", submitRoute(alvo), { files: alvo.correta })
  const jobs = jobsAfter(await runner.stats(), beforeAt)
  return montarMedida({ cenario: chave, via: "api", descricao: alvo.alvo.descricao, motor: alvo.alvo.motor, condicao, repeticao, totalMs: response.ms, status: response.status, passou: response.body?.passed ?? null, poolAntes, inicio, jobs })
}

/** Cenários "piso": um lote trivial direto no executor (sem API, banco nem sessão). */
function pisoScenario(chave: string, runner: RunnerClient, engineVersions: Record<string, unknown>): Cenario {
  const jobs: Record<string, { motor: "python" | "dados" | "ml"; descricao: string; job: DirectJob }> = {
    "piso-python": { motor: "python", descricao: "piso WASI: print('ok')", job: { runtime: "python", code: 'print("ok")\n' } },
    "piso-dados": { motor: "dados", descricao: "piso Pyodide (perfil dados): import numpy, pandas", job: { runtime: "python-dados", libraries: ["numpy", "pandas"], code: "import numpy, pandas\nprint('ok')\n" } },
    "piso-ml": { motor: "ml", descricao: "piso Pyodide (perfil ml): import sklearn", job: { runtime: "python-dados", libraries: ["numpy", "pandas", "scikit-learn"], code: "import sklearn\nprint('ok')\n" } },
  }
  const spec = jobs[chave]
  if (!spec) throw new Error(`cenário desconhecido: ${chave}`)
  const perfil = spec.motor === "python" ? null : spec.motor
  return {
    chave,
    via: "runner_direto",
    descricao: spec.descricao,
    motor: spec.motor,
    perfil,
    executar: async (condicao, repeticao) => {
      const before = await runner.stats()
      const beforeAt = lastJobAt(before)
      const poolAntes = perfil !== null ? warmWorkers(before, perfil) : null
      const inicio = nowIso()
      const result = await runner.run(spec.job)
      if (result.engine) engineVersions[spec.motor] = result.engine
      const after = await runner.stats()
      return montarMedida({ cenario: chave, via: "runner_direto", descricao: spec.descricao, motor: spec.motor, condicao, repeticao, totalMs: result.ms, status: result.status, passou: result.ok, poolAntes, inicio, jobs: jobsAfter(after, beforeAt) })
    },
  }
}

/**
 * A condição vale pelo que foi OBSERVADO no pool antes do envio, não pelo que se pretendia:
 * um "frio de pool" que encontrou worker aquecido (reposição rápida) é quente, e um "quente" que
 * encontrou o pool vazio é frio. `frio_processo` (executor reiniciado) não muda.
 */
function condicaoObservada(pretendida: Condicao, poolAntes: number | null): Condicao {
  if (poolAntes === null || pretendida === "frio_processo") return pretendida
  return poolAntes >= 1 ? "quente" : "frio_pool"
}

function montarMedida(input: { cenario: string; via: Medida["via"]; descricao: string; motor: string; condicao: Condicao; repeticao: number; totalMs: number; status: number; passou: boolean | null; poolAntes: number | null; inicio: string; jobs: ReturnType<typeof jobsAfter> }): Medida {
  const job = input.jobs.at(-1)
  return {
    cenario: input.cenario,
    via: input.via,
    descricao: input.descricao,
    motor: input.motor,
    condicao: condicaoObservada(input.condicao, input.poolAntes),
    repeticao: input.repeticao,
    totalMs: input.totalMs,
    execMs: job?.execMs ?? null,
    filaMs: job?.queueMs ?? null,
    lotes: job?.batches ?? null,
    sobrecargaMs: job ? input.totalMs - job.execMs - job.queueMs : null,
    poolAntes: input.poolAntes,
    passou: input.passou,
    status: input.status,
    ruido: input.jobs.length > 1,
    inicio: input.inicio,
    politica: null,
  }
}

/** Perfil Pyodide de um motor (`python` é o motor WASI, sem perfil). */
function perfilDoMotor(motor: string): PerfilPyodide | null {
  return motor === "dados" || motor === "ml" ? motor : null
}

/** Motor de um cenário pela chave (`a`…`e` vêm do pacote; `piso-<motor>` é direto no executor). */
function motorDoCenario(chave: string): string {
  if (chave.startsWith("piso-")) return chave.slice("piso-".length)
  return ALVOS_LATENCIA.find((alvo) => alvo.chave === chave)?.motor ?? ""
}

function rowOf(medida: Medida): (string | number | boolean | null)[] {
  return [
    medida.cenario, medida.via, medida.descricao, medida.motor, medida.condicao, medida.repeticao,
    round(medida.totalMs), medida.execMs, medida.filaMs, medida.lotes, round(medida.sobrecargaMs), medida.poolAntes,
    medida.passou, medida.status, medida.ruido ? 1 : 0, medida.inicio, medida.politica,
  ]
}

/** Recalcula `latencia-resumo.csv` do CSV COMPLETO (inclui cenários de rodadas anteriores) e o imprime. */
function summarizeAndSave(csvFile: string): void {
  const todas = readCsv(csvFile)
  const rows = resumoLatencia(todas)
  const summaryFile = path.join(path.dirname(csvFile), "latencia-resumo.csv")
  writeDerivedCsv(summaryFile, LATENCIA_RESUMO_HEADER, rows)
  console.log(`\nResumo (ms; ${summaryFile.replace(/\\/g, "/")}):`)
  console.log(formatTable(LATENCIA_RESUMO_HEADER, rows))
  const failed = todas.filter((linha) => linha.status !== "200" || linha.passou === "false").length
  if (failed > 0) console.warn(`\nAVISO: ${failed} execução(ões) no CSV sem status 200 ou sem aprovação (ficam no CSV; as sem status 200 não entram no resumo).`)
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(() => limpeza.run())
