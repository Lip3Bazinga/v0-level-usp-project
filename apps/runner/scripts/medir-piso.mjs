#!/usr/bin/env node
// Mede o piso de tempo de um lote trivial em cada motor do executor (docs/v2/desempenho-executor.md).
//
//   RUNNER_URL=http://127.0.0.1:8081 RUNNER_TOKEN=... node scripts/medir-piso.mjs [repeticoes] [motor...]
//
// `motor`: wasi, pyodide-dados, pyodide-ml (omitido = os três). O token nunca é impresso.
//
// Para cada motor roda dois cenários, um pedido por vez:
//   - "sequencia": um pedido logo depois do outro (como o content:verify faz);
//   - "espacado": espera o pool ter um worker aquecido antes de cada pedido.
// A diferença entre os dois é o tempo de obtenção do worker. Não rode junto com outro
// verify ou medição: os motores dividem a mesma fila.
//
// Colunas (ms): httpMs = pedido inteiro visto pelo cliente; jobMs = `durationMs` do executor;
// queueMs = espera no semáforo; execMs = do início ao fim do lote (obtenção do worker +
// harness); overheadMs = httpMs - jobMs (ida e volta HTTP, JSON e validação do pedido).
// A decomposição do aquecimento em si está no `medir-aquecimento.mjs`.

const RUNNER_URL = process.env.RUNNER_URL ?? "http://127.0.0.1:8081"
const RUNNER_TOKEN = process.env.RUNNER_TOKEN ?? ""
const REPETITIONS = Number(process.argv[2] ?? 20)
const WANTED_ENGINES = process.argv.slice(3)
const WARM_POLL_MS = 100
const WARM_TIMEOUT_MS = 120_000

const ENGINES = [
  { name: "wasi", runtime: "python", libraries: [], profile: null, code: "resultado = 1 + 1\n" },
  { name: "pyodide-dados", runtime: "python-dados", libraries: ["numpy"], profile: "dados", code: "import numpy\nresultado = int(numpy.sum([1, 1]))\n" },
  { name: "pyodide-ml", runtime: "python-dados", libraries: ["scikit-learn"], profile: "ml", code: "import sklearn\nresultado = 1 + 1\n" },
]

const headers = { authorization: `Bearer ${RUNNER_TOKEN}`, "content-type": "application/json" }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function getJson(path) {
  const response = await fetch(`${RUNNER_URL}${path}`, { headers })
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
  return response.json()
}

async function waitWarm(profile) {
  if (profile === null) return
  const deadline = Date.now() + WARM_TIMEOUT_MS
  while (Date.now() < deadline) {
    const health = await getJson("/healthz")
    if ((health.pyodide?.warm?.[profile] ?? 0) > 0) return
    await sleep(WARM_POLL_MS)
  }
  throw new Error(`perfil ${profile} não aqueceu em ${WARM_TIMEOUT_MS} ms`)
}

async function runOnce(engine) {
  const job = {
    files: [{ path: "main.py", content: engine.code }],
    entry: "main.py",
    probes: [{ id: "p", kind: "globals", names: ["resultado"] }],
    runtime: engine.runtime,
    libraries: engine.libraries,
  }
  const startedAt = performance.now()
  const response = await fetch(`${RUNNER_URL}/v1/run`, { method: "POST", headers, body: JSON.stringify(job) })
  const result = await response.json()
  const httpMs = performance.now() - startedAt
  if (!response.ok || result.observations?.[0]?.ok !== true) throw new Error(`${engine.name}: ${JSON.stringify(result).slice(0, 300)}`)
  // Com a fila vazia e um pedido por vez, o último job de `/v1/stats` é o que acabou de rodar.
  const stats = await getJson("/v1/stats")
  const last = stats.recent.at(-1) ?? { queueMs: 0, execMs: 0 }
  return { httpMs, jobMs: result.durationMs, queueMs: last.queueMs, execMs: last.execMs, overheadMs: httpMs - result.durationMs }
}

function summarize(samples, key) {
  const values = samples.map((sample) => sample[key]).sort((a, b) => a - b)
  const at = (fraction) => values[Math.min(values.length - 1, Math.floor(fraction * values.length))]
  // A média importa quando os pedidos se alternam entre esperar um aquecimento e não esperar.
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  return { media: Math.round(mean), mediana: Math.round(at(0.5)), p90: Math.round(at(0.9)), min: Math.round(values[0]), max: Math.round(values.at(-1)) }
}

async function measure(engine, spaced) {
  const samples = []
  await waitWarm(engine.profile)
  for (let index = 0; index < REPETITIONS; index++) {
    if (spaced) await waitWarm(engine.profile)
    samples.push(await runOnce(engine))
  }
  const row = { motor: engine.name, cenario: spaced ? "espacado" : "sequencia", n: samples.length }
  for (const key of ["httpMs", "jobMs", "queueMs", "execMs", "overheadMs"]) row[key] = summarize(samples, key)
  return row
}

if (!Number.isInteger(REPETITIONS) || REPETITIONS < 1) throw new Error("repeticoes deve ser um inteiro positivo")
const unknownEngines = WANTED_ENGINES.filter((name) => !ENGINES.some((engine) => engine.name === name))
if (unknownEngines.length > 0) throw new Error(`motor desconhecido: ${unknownEngines.join(", ")} (use ${ENGINES.map((engine) => engine.name).join(", ")})`)
const selectedEngines = WANTED_ENGINES.length === 0 ? ENGINES : ENGINES.filter((engine) => WANTED_ENGINES.includes(engine.name))
const before = await getJson("/v1/stats")
if (before.active > 0 || before.pending > 0) throw new Error("executor ocupado: meça com a fila vazia")
const rows = []
for (const engine of selectedEngines) {
  for (const spaced of [false, true]) {
    const row = await measure(engine, spaced)
    rows.push(row)
    console.log(JSON.stringify(row))
  }
}
const after = await getJson("/v1/stats")
console.log(JSON.stringify({ pyodide: after.engines.pyodide ?? null }))
