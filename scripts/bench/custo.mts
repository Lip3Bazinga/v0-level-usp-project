/**
 * Dimensionamento para 100 alunos (vCPUs e memória, com folga de 30%) a partir dos CSVs medidos.
 *
 *   node scripts/bench/custo.mts [--alunos 100] [--folga 0.3] [--mix python=0.4,dados=0.4,ml=0.2]
 *        [--preco-vcpu-hora P] [--preco-gib-hora P]
 *
 * Lê docs/tcc/dados/latencia.csv, recursos.csv e carga.csv (gerados por latencia.mts, recursos.mts e
 * carga.mts) e imprime a conta passo a passo; a fórmula está em docs/tcc/custo-100-alunos.md.
 * O preço por hora é PARÂMETRO: sem ele o script imprime a fórmula com as incógnitas, nunca um valor.
 */
import { existsSync } from "node:fs"
import path from "node:path"
import { flagOption, numberOption, optionalNumberOption, optionalStringOption, parseArgs, rejectUnknown, stringOption } from "./lib/args.mts"
import { cellNumber, formatTable, groupBy, percentile, readCsv, round } from "./lib/estatistica.mts"
import { DATA_DIR } from "./lib/sistema.mts"

const KNOWN_OPTIONS = ["dados", "alunos", "pensar-medio-s", "folga", "mix", "estatistica", "condicao", "fator-pico", "vcpu-api-bd", "mem-api-bd-mib", "preco-vcpu-hora", "preco-gib-hora", "horas-mes", "ajuda"]
const MOTORES = ["python", "dados", "ml"] as const
type Motor = (typeof MOTORES)[number]

const HELP = `Uso: node scripts/bench/custo.mts [opções]
  --dados PASTA            pasta dos CSVs (padrão docs/tcc/dados)
  --alunos N               alunos simultâneos (padrão 100)
  --pensar-medio-s S       intervalo médio entre envios de um aluno (padrão 45 = média de 30–60 s)
  --folga F                folga sobre a demanda (padrão 0.3 = 30%)
  --mix python=0.4,dados=0.4,ml=0.2   fração dos envios por motor (padrão: partes iguais) — PREMISSA
  --estatistica p50|p95|p99   tempo de executor usado como tempo de serviço (padrão p95)
  --condicao quente|frio|pior   condição do tempo de serviço (padrão pior = a mais lenta medida)
  --fator-pico X           multiplica a concorrência média para cobrir rajadas (padrão 1)
  --vcpu-api-bd V          vCPUs da API + PostgreSQL (não medidos em contêiner; padrão 1) — PREMISSA
  --mem-api-bd-mib M       memória da API + PostgreSQL em MiB (padrão 1024) — PREMISSA
  --preco-vcpu-hora P, --preco-gib-hora P, --horas-mes H (padrão 730)   preço opcional (qualquer moeda)`

interface Servico {
  /** Tempo de serviço do executor (ms) na estatística e condição escolhidas. */
  ms: number
  condicao: string
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (flagOption(args, "ajuda")) return void console.log(HELP)
  rejectUnknown(args, KNOWN_OPTIONS)
  const dir = path.resolve(stringOption(args, "dados", DATA_DIR))
  const alunos = numberOption(args, "alunos", 100)
  const pensar = numberOption(args, "pensar-medio-s", 45)
  const folga = numberOption(args, "folga", 0.3)
  const fatorPico = numberOption(args, "fator-pico", 1)
  const vcpuApi = numberOption(args, "vcpu-api-bd", 1)
  const memApi = numberOption(args, "mem-api-bd-mib", 1024)
  const estatistica = stringOption(args, "estatistica", "p95")
  const condicao = stringOption(args, "condicao", "pior")
  if (!["p50", "p95", "p99"].includes(estatistica)) throw new Error("--estatistica precisa ser p50, p95 ou p99")
  if (!["quente", "frio", "pior"].includes(condicao)) throw new Error("--condicao precisa ser quente, frio ou pior")
  const mix = parseMix(optionalStringOption(args, "mix"))

  const latencia = readRequired(dir, "latencia.csv", "latencia.mts")
  const recursos = readRequired(dir, "recursos.csv", "recursos.mts workers")
  const cargaFile = path.join(dir, "carga.csv")
  const carga = existsSync(cargaFile) ? readCsv(cargaFile) : []

  const servico = tempoDeServico(latencia, Number(estatistica.slice(1)), condicao)
  const porWorker = recursosPorWorker(recursos)
  const lambdaTotal = alunos / pensar

  console.log(`Premissas: ${alunos} alunos, 1 envio a cada ${pensar} s em média → ${round(lambdaTotal, 3)} envios/s; folga ${folga * 100}%; fator de pico ${fatorPico}; serviço = ${estatistica} do executor, condição ${condicao}.`)
  console.log(`Mix de envios: ${MOTORES.map((motor) => `${motor}=${round(mix[motor], 3)}`).join(", ")}${optionalStringOption(args, "mix") === undefined ? " (partes iguais: premissa, informe --mix)" : ""}`)
  console.log(`API + banco (premissa, não medida em contêiner): ${vcpuApi} vCPU, ${memApi} MiB.\n`)

  const missing: string[] = []
  const rows: (string | number | null)[][] = []
  let vcpuDemanda = vcpuApi
  let memRunner = 0
  let memIdle = 0
  for (const motor of MOTORES) {
    const s = servico.get(motor)
    const w = porWorker.get(motor)
    if (mix[motor] > 0 && (!s || !w)) {
      missing.push(`${motor}: ${!s ? "tempo de serviço (latencia.csv) " : ""}${!w ? "CPU/memória por worker (recursos.csv, tipo workers)" : ""}`.trim())
      continue
    }
    if (!s || !w) continue
    const lambda = lambdaTotal * mix[motor]
    const concorrencia = lambda * (s.ms / 1000) * fatorPico
    const workers = Math.max(1, Math.ceil(concorrencia))
    const vcpu = (concorrencia * w.cpuPct) / 100
    const mem = workers * w.memMiB
    vcpuDemanda += mix[motor] > 0 ? vcpu : 0
    memRunner += mix[motor] > 0 ? mem : 0
    memIdle = Math.max(memIdle, w.idleMiB)
    rows.push([motor, round(lambda, 3), round(s.ms, 0), s.condicao, round(concorrencia, 2), workers, round(w.cpuPct, 0), round(vcpu, 2), round(w.memMiB, 0), round(mem, 0)])
  }
  console.log("Por motor (c = λ × S: workers ocupados ao mesmo tempo, Lei de Little):")
  console.log(formatTable(["motor", "λ_env/s", "S_exec_ms", "condição", "c", "workers", "cpu_por_worker_%", "vCPU", "mem_por_worker_MiB", "mem_MiB"], rows))
  if (missing.length > 0) console.warn(`\nFALTAM DADOS (a soma abaixo é parcial): \n- ${missing.join("\n- ")}`)

  const vcpuTotal = vcpuDemanda * (1 + folga)
  const memTotalMiB = (memRunner + memIdle + memApi) * (1 + folga)
  const memTotalGiB = memTotalMiB / 1024
  console.log(`\nvCPU: (Σ vCPU dos motores + API/BD) × (1 + folga) = (${round(vcpuDemanda - vcpuApi, 2)} + ${vcpuApi}) × ${1 + folga} = ${round(vcpuTotal, 2)} → ${Math.ceil(vcpuTotal)} vCPU`)
  console.log(`Memória: (Σ workers × mem_por_worker + executor ocioso ${round(memIdle, 0)} MiB + API/BD ${memApi} MiB) × (1 + folga) = ${round(memTotalMiB, 0)} MiB = ${round(memTotalGiB, 2)} GiB`)

  const precoVcpu = optionalNumberOption(args, "preco-vcpu-hora")
  const precoGib = optionalNumberOption(args, "preco-gib-hora")
  const horasMes = numberOption(args, "horas-mes", 730)
  if (precoVcpu !== undefined && precoGib !== undefined) {
    const hora = Math.ceil(vcpuTotal) * precoVcpu + memTotalGiB * precoGib
    console.log(`Custo/hora = ${Math.ceil(vcpuTotal)} × ${precoVcpu} + ${round(memTotalGiB, 2)} × ${precoGib} = ${round(hora, 4)}; por mês (${horasMes} h) = ${round(hora * horasMes, 2)} (na moeda dos preços informados)`)
  } else {
    console.log(`Custo/hora = ${Math.ceil(vcpuTotal)} × P_vcpu + ${round(memTotalGiB, 2)} × P_gib   (informe --preco-vcpu-hora e --preco-gib-hora; este script não assume preço)`)
  }

  validarComCarga(carga, alunos)
}

/** Confronta a conta com o que o teste de carga mediu (maior N sem saturar por motor). */
function validarComCarga(carga: Record<string, string>[], alunos: number): void {
  if (carga.length === 0) return void console.log("\n(carga.csv ausente: rode carga.mts para validar a conta contra o ponto de saturação medido.)")
  const rows: (string | number | null)[][] = []
  for (const [motor, group] of groupBy(carga, (row) => row.motor ?? "")) {
    const livres = group.filter((row) => row.saturou === "false").map((row) => cellNumber(row.usuarios) ?? 0)
    const saturados = group.filter((row) => row.saturou === "true").map((row) => cellNumber(row.usuarios) ?? 0)
    const maiorLivre = livres.length === 0 ? null : Math.max(...livres)
    const primeiroSaturado = saturados.length === 0 ? null : Math.min(...saturados)
    const capacidade = cellNumber(group[0]?.capacidade_runner)
    rows.push([motor, maiorLivre, primeiroSaturado, capacidade, maiorLivre !== null && maiorLivre >= alunos ? "sim" : "não"])
  }
  console.log(`\nValidação com carga.csv (máquina e executor desse teste; ${alunos} alunos aguentados?):`)
  console.log(formatTable(["motor", "maior_N_sem_saturar", "primeiro_N_saturado", "capacidade_executor", `aguenta_${alunos}`], rows))
}

function readRequired(dir: string, name: string, producer: string): Record<string, string>[] {
  const file = path.join(dir, name)
  if (!existsSync(file)) throw new Error(`${file} não existe: gere-o com scripts/bench/${producer}.mts antes.`)
  return readCsv(file)
}

/** `python=0.4,dados=0.4,ml=0.2` (normaliza para somar 1); sem valor, partes iguais. */
function parseMix(text: string | undefined): Record<Motor, number> {
  if (text === undefined) return { python: 1 / 3, dados: 1 / 3, ml: 1 / 3 }
  const mix: Record<Motor, number> = { python: 0, dados: 0, ml: 0 }
  for (const part of text.split(",")) {
    const [name = "", value = ""] = part.split("=").map((item) => item.trim())
    if (!(MOTORES as readonly string[]).includes(name) || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error(`--mix inválido em "${part}" (use python=0.4,dados=0.4,ml=0.2)`)
    mix[name as Motor] = Number(value)
  }
  const total = mix.python + mix.dados + mix.ml
  if (total <= 0) throw new Error("--mix precisa de pelo menos um valor positivo")
  return { python: mix.python / total, dados: mix.dados / total, ml: mix.ml / total }
}

/**
 * Tempo de serviço por motor: a estatística pedida do `runner_exec_ms` dos cenários via API (sem
 * ruído, status 200). `pior` toma a maior entre as condições e os cenários do motor (conservador).
 */
function tempoDeServico(latencia: Record<string, string>[], percent: number, condicao: string): Map<Motor, Servico> {
  const result = new Map<Motor, Servico>()
  const usable = latencia.filter((row) => row.via === "api" && row.status === "200" && row.ruido !== "1" && cellNumber(row.runner_exec_ms) !== null)
  for (const [motor, byMotor] of groupBy(usable, (row) => row.motor ?? "")) {
    let best: Servico | null = null
    for (const [key, group] of groupBy(byMotor, (row) => `${row.cenario}|${row.condicao}`)) {
      const cond = key.split("|")[1] ?? ""
      const isCold = cond.startsWith("frio")
      if (condicao === "quente" && isCold) continue
      if (condicao === "frio" && !isCold) continue
      const value = percentile(group.map((row) => cellNumber(row.runner_exec_ms) ?? 0), percent)
      if (value !== null && (best === null || value > best.ms)) best = { ms: value, condicao: `${cond} (${key.split("|")[0]})` }
    }
    if (best && (MOTORES as readonly string[]).includes(motor)) result.set(motor as Motor, best)
  }
  return result
}

interface PorWorker {
  /** CPU de um worker ocupado (% de um núcleo). */
  cpuPct: number
  /** Memória adicional de um worker (MiB), sobre o executor ocioso. */
  memMiB: number
  /** Memória do executor ocioso (MiB). */
  idleMiB: number
}

/** De `recursos.csv` (tipo `workers`): pico por k, descontado o ocioso (k=0), por worker; o k mais exigente vale. */
function recursosPorWorker(recursos: Record<string, string>[]): Map<Motor, PorWorker> {
  const result = new Map<Motor, PorWorker>()
  const rows = recursos.filter((row) => row.tipo === "workers")
  for (const [motor, byMotor] of groupBy(rows, (row) => row.motor ?? "")) {
    const peaks = new Map<number, { cpu: number; mem: number }>()
    for (const row of byMotor) {
      const k = cellNumber(row.k_concorrentes)
      const cpu = cellNumber(row.cpu_pct)
      const mem = cellNumber(row.mem_mib)
      if (k === null || cpu === null || mem === null) continue
      const current = peaks.get(k) ?? { cpu: 0, mem: 0 }
      peaks.set(k, { cpu: Math.max(current.cpu, cpu), mem: Math.max(current.mem, mem) })
    }
    const idle = peaks.get(0)
    if (!idle || !(MOTORES as readonly string[]).includes(motor)) continue
    let cpuPct = 0
    let memMiB = 0
    for (const [k, peak] of peaks) {
      if (k < 1) continue
      cpuPct = Math.max(cpuPct, peak.cpu / k)
      memMiB = Math.max(memMiB, (peak.mem - idle.mem) / k)
    }
    if (cpuPct > 0) result.set(motor as Motor, { cpuPct, memMiB, idleMiB: idle.mem })
  }
  return result
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
