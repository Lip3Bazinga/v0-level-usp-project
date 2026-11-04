import { parseArgs } from "node:util"

/** Cenários disponíveis. */
export type ScenarioName = "turma" | "rajada"

/** Opções do `pnpm load:turma`, já validadas e com os padrões aplicados. */
export interface LoadOptions {
  scenario: ScenarioName
  target: string
  apiOrigin: string | null
  /** Uma etapa por número de alunos (ex.: 20,40,80,120 para achar o joelho). */
  students: number[]
  simulatedMinutes: number
  compression: number
  rampSeconds: number
  lessonRange: [number, number]
  burstLesson: number
  windowSeconds: number
  waves: number
  pauseSeconds: number
  setupConcurrency: number
  retries: number
  retryWait: [number, number]
  ipPerStudent: boolean
  downloadAssets: boolean
  pyodide: boolean
  runnerUrl: string | null
  pgUrl: string | null
  processes: Record<string, number>
  outputDir: string | null
  seed: number
  accountPrefix: string
  password: string
  connections: number
  stepPauseSeconds: number
  authorizedTarget: boolean
  topQueries: number
  courseTitle: string
  help: boolean
}

/** Texto de `--ajuda`. */
export const USAGE = `pnpm load:turma [opções]

Cenários (--cenario):
  turma   alunos em aula, em regime (cadastro, painel, curso, lições, autosave, notas,
          ranking e Verificar até passar), com tempo de pensar comprimido
  rajada  toda a turma abre a mesma lição e clica em Verificar dentro de --janela s

Alvo e segurança:
  --alvo URL               web (padrão http://localhost:3000); /api/* passa pelo rewrite da web
  --api URL                manda /api/* direto à API (sem o proxy da web)
  --alvo-autorizado        obrigatório para qualquer alvo fora desta máquina

Turma:
  --alunos N[,N...]        alunos por etapa (padrão 40); várias etapas acham o joelho
  --duracao MIN            minutos de aula simulados por etapa (padrão 20)
  --compressao C           tempo de pensar dividido por C (padrão 4; equivale a N×C alunos)
  --rampa S                chegada dos alunos ao longo de S s reais (padrão 30)
  --licoes A-B             recorte do curso (padrão 1-22; peso maior nas primeiras)
Rajada:
  --licao P                posição da lição no curso (padrão 5)
  --janela S               todos clicam dentro de S s (padrão 10)
  --ondas K / --pausa S    repetições e intervalo entre elas (padrão 1 / 60)
Comportamento:
  --reenvios N             vezes que o aluno insiste após 503/429 (padrão 2)
  --espera-reenvio A-B     espera antes de insistir, em s (padrão 3-6)
  --ip-por-aluno           X-Forwarded-For diferente por aluno (padrão: todos no mesmo IP, como num laboratório com NAT)
  --sem-assets             não baixa JS/CSS da primeira tela
  --pyodide                baixa o núcleo do Pyodide (~13 MB) ao abrir a primeira lição
Medição no servidor:
  --runner-url URL         lê a fila do executor em /v1/stats (token em RUNNER_TOKEN)
  --pg-url URL             zera e lê o pg_stat_statements
  --monitorar a=PID,...    CPU/RSS de processos (ex.: api=123,web=456,runner=789,postgres=42)
Saída:
  --saida DIR              pasta do relatório (padrão load-results/<data>-<cenário>)
  --semente N, --prefixo P, --senha S, --conexoes N, --pausa-etapas S, --top-consultas N, --curso TITULO
`

function parseNumber(name: string, raw: string | undefined, fallback: number, min = 0): number {
  if (raw === undefined) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || value < min) throw new Error(`--${name} inválido: ${raw}`)
  return value
}

function parseRange(name: string, raw: string | undefined, fallback: [number, number]): [number, number] {
  if (raw === undefined) return fallback
  const match = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(raw.trim())
  const low = Number(match?.[1])
  const high = Number(match?.[2])
  if (!match || low > high) throw new Error(`--${name} inválido: ${raw} (use A-B)`)
  return [low, high]
}

/**
 * Lê `nome=pid,nome=pid`.
 *
 * @throws Error se algum par não tiver nome e pid numérico.
 */
export function parseProcessList(raw: string | undefined): Record<string, number> {
  if (!raw) return {}
  const processes: Record<string, number> = {}
  for (const pair of raw.split(",")) {
    const [name, pid] = pair.split("=")
    const value = Number(pid)
    if (!name || !Number.isInteger(value) || value <= 0) throw new Error(`--monitorar inválido: ${pair} (use nome=pid)`)
    processes[name.trim()] = value
  }
  return processes
}

/**
 * Interpreta a linha de comando.
 *
 * @throws Error com mensagem pt-BR quando uma opção é inválida.
 */
export function parseOptions(argv: readonly string[], env: NodeJS.ProcessEnv = process.env): LoadOptions {
  const { values } = parseArgs({
    args: argv.filter((arg) => arg !== "--"),
    strict: true,
    options: {
      cenario: { type: "string" },
      alvo: { type: "string" },
      api: { type: "string" },
      alunos: { type: "string" },
      duracao: { type: "string" },
      compressao: { type: "string" },
      rampa: { type: "string" },
      licoes: { type: "string" },
      licao: { type: "string" },
      janela: { type: "string" },
      ondas: { type: "string" },
      pausa: { type: "string" },
      "preparacao-paralela": { type: "string" },
      reenvios: { type: "string" },
      "espera-reenvio": { type: "string" },
      "ip-por-aluno": { type: "boolean" },
      "sem-assets": { type: "boolean" },
      pyodide: { type: "boolean" },
      "runner-url": { type: "string" },
      "pg-url": { type: "string" },
      monitorar: { type: "string" },
      saida: { type: "string" },
      semente: { type: "string" },
      prefixo: { type: "string" },
      senha: { type: "string" },
      conexoes: { type: "string" },
      "pausa-etapas": { type: "string" },
      "alvo-autorizado": { type: "boolean" },
      "top-consultas": { type: "string" },
      curso: { type: "string" },
      ajuda: { type: "boolean" },
    },
  })
  const scenario = values.cenario ?? "turma"
  if (scenario !== "turma" && scenario !== "rajada") throw new Error(`--cenario inválido: ${scenario} (turma ou rajada)`)
  const students = (values.alunos ?? "40").split(",").map((raw) => parseNumber("alunos", raw, 40, 1))
  if (students.some((count) => !Number.isInteger(count))) throw new Error("--alunos precisa de inteiros")
  return {
    scenario,
    target: values.alvo ?? "http://localhost:3000",
    apiOrigin: values.api ?? null,
    students,
    simulatedMinutes: parseNumber("duracao", values.duracao, 20, 0.1),
    compression: parseNumber("compressao", values.compressao, 4, 1),
    rampSeconds: parseNumber("rampa", values.rampa, 30),
    lessonRange: parseRange("licoes", values.licoes, [1, 22]),
    burstLesson: parseNumber("licao", values.licao, 5, 1),
    windowSeconds: parseNumber("janela", values.janela, 10),
    waves: parseNumber("ondas", values.ondas, 1, 1),
    pauseSeconds: parseNumber("pausa", values.pausa, 60),
    setupConcurrency: parseNumber("preparacao-paralela", values["preparacao-paralela"], 8, 1),
    retries: parseNumber("reenvios", values.reenvios, 2),
    retryWait: parseRange("espera-reenvio", values["espera-reenvio"], [3, 6]),
    ipPerStudent: values["ip-por-aluno"] ?? false,
    downloadAssets: !(values["sem-assets"] ?? false),
    pyodide: values.pyodide ?? false,
    runnerUrl: values["runner-url"] ?? null,
    pgUrl: values["pg-url"] ?? env.LOAD_PG_URL ?? null,
    processes: parseProcessList(values.monitorar),
    outputDir: values.saida ?? null,
    seed: parseNumber("semente", values.semente, 42),
    accountPrefix: values.prefixo ?? `carga-${Date.now().toString(36)}`,
    password: values.senha ?? "CargaTurma2026",
    connections: parseNumber("conexoes", values.conexoes, 256, 1),
    stepPauseSeconds: parseNumber("pausa-etapas", values["pausa-etapas"], 20),
    authorizedTarget: values["alvo-autorizado"] ?? false,
    topQueries: parseNumber("top-consultas", values["top-consultas"], 12, 1),
    courseTitle: values.curso ?? "Python Completo",
    help: values.ajuda ?? false,
  }
}
