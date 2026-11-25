/**
 * Memória e CPU por worker de cada motor e tamanho das imagens Docker.
 *
 *   node scripts/bench/recursos.mts imagens  [--imagens "levelusp|postgres"]
 *   node scripts/bench/recursos.mts workers  [--motores python,dados,ml] [--k 1,2,4] [--contêiner runner]
 *   node scripts/bench/recursos.mts amostrar --rotulo carga-dados-50 --motor dados --duracao-s 120
 *
 * Tudo vai para <--dir-dados>/recursos.csv (padrão docs/tcc/dados). Rodada parcial troca só as
 * linhas das mesmas medidas (tipo, rótulo, motor, k, imagem) e preserva as demais; `--zerar` recomeça
 * o arquivo. Cada execução acrescenta uma rodada à seção "recursos" de ambiente.json.
 * Só enxerga executor que roda em contêiner (`docker stats`): o executor iniciado com
 * `pnpm --filter @levelusp/runner dev` no host não aparece. Use o perfil `runner` do compose de dev
 * (`docker compose -f infra/compose/compose.dev.yml --profile runner up -d`).
 *
 * `workers`: o contêiner do executor é lido ocioso (k=0) e depois com k jobs simultâneos de
 * ~`--duracao-job-s` s de CPU; memória por worker = (pico com k − ocioso) ÷ k. É uma estimativa:
 * no Pyodide o pico inclui o worker de reposição que o executor aquece em segundo plano.
 */
import path from "node:path"
import { flagOption, listOption, numberOption, parseArgs, rejectUnknown, stringOption } from "./lib/args.mts"
import { listImageSizes, sampleContainers } from "./lib/docker.mts"
import { dirDados, registerRound, writeDerivedCsv } from "./lib/dados.mts"
import { formatTable, round } from "./lib/estatistica.mts"
import { readExecutorConfig } from "./lib/executor.mts"
import { mergeRecursos, RECURSOS_HEADER, recursosFile, startSampler } from "./lib/recursos.mts"
import { type DirectJob, RunnerClient, requireRunnerToken } from "./lib/runner.mts"
import { collectEnvironment, nowIso, sleep } from "./lib/sistema.mts"

const KNOWN_OPTIONS = ["dir-dados", "zerar", "imagens", "motores", "k", "contêiner", "conteiner", "duracao-job-s", "ocioso-s", "runner-url", "rotulo", "motor", "duracao-s", "intervalo-s", "ajuda"]

const HELP = `Uso: node scripts/bench/recursos.mts <imagens|workers|amostrar> [opções]
  imagens   tamanho das imagens locais (--imagens REGEX, padrão "levelusp|postgres")
  workers   memória/CPU com k jobs simultâneos (--motores python,dados,ml  --k 1,2,4  --duracao-job-s 6  --ocioso-s 10)
  amostrar  amostra o contêiner enquanto você roda outra carga (--rotulo R --motor M --duracao-s 120 --intervalo-s 3)
  comuns    --dir-dados PASTA (padrão docs/tcc/dados; recursos.csv e ambiente.json vão para lá)  --zerar (recomeça o recursos.csv)
            --conteiner REGEX (padrão "runner")  --runner-url URL ($RUNNER_URL; token em $RUNNER_TOKEN)
  Regravar o CSV troca só as linhas das mesmas medidas (tipo, rótulo, motor, k, imagem) e preserva as demais.`

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (flagOption(args, "ajuda") || args.positional.length === 0) return void console.log(HELP)
  rejectUnknown(args, KNOWN_OPTIONS)
  const dir = dirDados(args)
  const file = recursosFile(dir)
  if (flagOption(args, "zerar")) writeDerivedCsv(file, RECURSOS_HEADER, [])
  const pattern = new RegExp(stringOption(args, "conteiner", stringOption(args, "contêiner", "runner")))

  const command = args.positional[0]
  if (command === "imagens") await imagens(dir, file, new RegExp(stringOption(args, "imagens", "levelusp|postgres")))
  else if (command === "workers") await workers(args, dir, file, pattern)
  else if (command === "amostrar") await amostrar(args, file, pattern)
  else throw new Error(`subcomando desconhecido: ${command ?? ""}\n${HELP}`)
}

async function imagens(dir: string, file: string, pattern: RegExp): Promise<void> {
  const images = await listImageSizes(pattern)
  if (images.length === 0) console.warn("Nenhuma imagem casou. Construa as imagens (docker compose … build) e confira o padrão com --imagens.")
  const rows = images.map((image) => ["imagem", "imagens", null, null, null, null, null, null, null, image.image, round(image.sizeMiB), nowIso()])
  const merged = mergeRecursos(file, rows)
  console.log(`recursos.csv: ${merged.substituidas} linha(s) substituída(s), ${merged.preservadas} preservada(s)`)
  console.log(formatTable(["imagem", "tamanho_mib"], images.map((image) => [image.image, round(image.sizeMiB)])))
  registerRound(dir, "recursos", { subcomando: "imagens", ...(await collectEnvironment()), imagens: images.map((image) => ({ imagem: image.image, id: image.id })) })
}

/** Código que ocupa um núcleo por ~`seconds` s; nos motores de dados faz contas com numpy (carrega a biblioteca). */
function busyJob(motor: string, seconds: number): DirectJob {
  const loop = `import time\nfim = time.time() + ${seconds}\n`
  if (motor === "python") return { runtime: "python", code: `${loop}while time.time() < fim:\n    pass\nprint("ok")\n`, timeoutMs: 30_000 }
  const code = `${loop}import numpy as np\nx = np.random.rand(200, 200)\nwhile time.time() < fim:\n    x = (x @ x) * 1e-3 + 0.5\nprint("ok")\n`
  const libraries = motor === "ml" ? ["numpy", "pandas", "scikit-learn"] : ["numpy", "pandas"]
  return { runtime: "python-dados", libraries, code: `${code}${motor === "ml" ? "import sklearn\n" : ""}`, timeoutMs: 30_000, memoryMb: 512 }
}

async function workers(args: ReturnType<typeof parseArgs>, dir: string, file: string, pattern: RegExp): Promise<void> {
  const motores = listOption(args, "motores", ["python", "dados", "ml"])
  const ks = listOption(args, "k", ["1", "2", "4"]).map(Number)
  const jobSeconds = numberOption(args, "duracao-job-s", 6)
  const idleSeconds = numberOption(args, "ocioso-s", 10)
  const runner = new RunnerClient(stringOption(args, "runner-url", process.env.RUNNER_URL ?? "http://localhost:8081"), requireRunnerToken())
  if (!(await runner.health()).ok) throw new Error("executor sem resposta em /healthz")
  const configInicial = await readExecutorConfig(runner)
  const capacity = configInicial.capacity
  if ((await sampleContainers(pattern)).length === 0) throw new Error(`nenhum contêiner em execução casa com /${pattern.source}/: o executor precisa rodar em Docker (veja o cabeçalho deste script)`)

  const summary: (string | number | null)[][] = []
  for (const motor of motores) {
    console.log(`\n== ${motor}: contêiner ocioso (${idleSeconds} s) ==`)
    const idleSampler = startSampler({ tipo: "workers", rotulo: `workers-${motor}`, motor, k: 0 }, pattern, 1_000)
    await sleep(idleSeconds * 1000)
    const idleRun = await idleSampler.stop()
    const idle = idleRun.samples
    gravarRecursos(file, idleRun.rows)
    const idleMem = Math.max(...idle.map((sample) => sample.memMiB), 0)
    summary.push([motor, 0, round(Math.max(...idle.map((sample) => sample.cpuPercent), 0)), round(idleMem), null, null])
    for (const k of ks) {
      if (capacity !== null && k > capacity) {
        console.warn(`  k=${k} > capacidade do executor (${capacity}): pulado (os jobs ficariam na fila, não simultâneos)`)
        continue
      }
      console.log(`  k=${k}: ${k} job(s) simultâneo(s) de ~${jobSeconds} s`)
      const sampler = startSampler({ tipo: "workers", rotulo: `workers-${motor}`, motor, k }, pattern, 1_000)
      const results = await Promise.all(Array.from({ length: k }, () => runner.run(busyJob(motor, jobSeconds))))
      const run = await sampler.stop()
      const samples = run.samples
      gravarRecursos(file, run.rows)
      const failed = results.filter((result) => !result.ok).length
      if (failed > 0) console.warn(`  ${failed} job(s) falharam (${results.find((result) => !result.ok)?.error ?? ""}): as leituras desse k não valem`)
      const peakMem = Math.max(...samples.map((sample) => sample.memMiB), 0)
      const peakCpu = Math.max(...samples.map((sample) => sample.cpuPercent), 0)
      summary.push([motor, k, round(peakCpu), round(peakMem), round((peakMem - idleMem) / k), round(peakCpu / k)])
      await sleep(5_000)
    }
  }
  console.log("\nPico por k (cpu_pct relativo a um núcleo):")
  console.log(formatTable(["motor", "k", "cpu_pico_pct", "mem_pico_mib", "mem_por_worker_mib", "cpu_por_worker_pct"], summary))
  const configFinal = await readExecutorConfig(runner)
  registerRound(dir, "recursos", { subcomando: "workers", ...(await collectEnvironment()), motores, executor: { inicio: configInicial, fim: configFinal }, parametros: { motores, k: ks, duracao_job_s: jobSeconds, ocioso_s: idleSeconds, conteiner: pattern.source } })
}

async function amostrar(args: ReturnType<typeof parseArgs>, file: string, pattern: RegExp): Promise<void> {
  const rotulo = stringOption(args, "rotulo", "amostra")
  const motor = stringOption(args, "motor", "")
  const duration = numberOption(args, "duracao-s", 60)
  const sampler = startSampler({ tipo: "amostra", rotulo, motor, k: null }, pattern, numberOption(args, "intervalo-s", 3) * 1000)
  console.log(`amostrando /${pattern.source}/ por ${duration} s (rótulo "${rotulo}")…`)
  await sleep(duration * 1000)
  const run = await sampler.stop()
  gravarRecursos(file, run.rows)
  console.log(`${run.samples.length} leitura(s) gravadas em ${file}`)
}

/** Mescla as leituras no CSV (só troca as linhas da mesma medida) e avisa o que foi substituído. */
function gravarRecursos(file: string, rows: readonly (readonly (string | number | null)[])[]): void {
  const merged = mergeRecursos(file, rows)
  if (merged.substituidas > 0) console.log(`  recursos.csv: ${merged.substituidas} linha(s) da medição anterior substituída(s); ${merged.preservadas} preservada(s)`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
