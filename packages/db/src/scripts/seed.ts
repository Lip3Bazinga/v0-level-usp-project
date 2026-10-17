/**
 * Seed idempotente para dev e homologação.
 *
 *   DATABASE_URL=...  SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=...  pnpm db:seed
 *   SEED_DEMO_USERS=true  → cria professor(a) e aluno(a) de demonstração
 *
 * Cria badges padrão, módulos, o curso "Python Completo" (22 exercícios com
 * gabarito declarativo, verificado contra soluções de referência) e uma prova
 * de demonstração. Em produção, o conteúdo real vem da importação do Supabase
 * (src/scripts/import-supabase.ts) — o seed só cria o admin e as badges.
 */
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { Algorithm, hash } from "@node-rs/argon2"
import { eq, sql } from "drizzle-orm"
import { DEFAULT_ENTRY_FILE, type ProjectFile, type TestCase, type UserRole } from "@levelusp/contracts"
import { createDb } from "../index"
import { badges, courses, exams, examQuestions, lessons, modules, profiles, users } from "../schema/index"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error("DATABASE_URL não definida")
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const shouldSeedContent = process.env.SEED_CONTENT !== "false"
const { db, close } = createDb(databaseUrl, { max: 1, applicationName: "levelusp-seed" })

/** Mesmos parâmetros OWASP do PasswordService da API (argon2id, 19 MiB, 2 iterações). */
const PASSWORD_HASH_OPTIONS = { algorithm: Algorithm.Argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const
const MIN_ADMIN_PASSWORD_LENGTH = 12
const DEFAULT_DEMO_PASSWORD = "demonstracao123"

const COURSE_TITLE = "Python Completo"
const FINAL_PROJECT_ORDER = 24
const LESSON_XP = 100
const FINAL_PROJECT_XP = 300
/** Tempo estimado de estudo por lição, em minutos. */
const LESSON_STUDY_MINUTES = 30

const BADGES = [
  { id: "primeiros-passos", name: "Primeiros passos", description: "Concluiu a primeira lição", icon: "Rocket", rarity: "common", criteriaType: "lessons_completed", criteriaValue: 1, sortOrder: 1 },
  { id: "dedicacao", name: "Dedicação", description: "Concluiu 10 lições", icon: "BookOpen", rarity: "rare", criteriaType: "lessons_completed", criteriaValue: 10, sortOrder: 2 },
  { id: "maratonista", name: "Maratonista", description: "Concluiu 20 lições", icon: "Medal", rarity: "epic", criteriaType: "lessons_completed", criteriaValue: 20, sortOrder: 3 },
  { id: "xp-500", name: "Aquecendo", description: "Acumulou 500 XP", icon: "Zap", rarity: "common", criteriaType: "total_xp", criteriaValue: 500, sortOrder: 4 },
  { id: "xp-2000", name: "Pythonista", description: "Acumulou 2.000 XP", icon: "Star", rarity: "rare", criteriaType: "total_xp", criteriaValue: 2000, sortOrder: 5 },
  { id: "sequencia-3", name: "Constância", description: "3 dias seguidos de estudo", icon: "Flame", rarity: "common", criteriaType: "current_streak", criteriaValue: 3, sortOrder: 6 },
  { id: "sequencia-7", name: "Semana perfeita", description: "7 dias seguidos de estudo", icon: "Flame", rarity: "epic", criteriaType: "max_streak", criteriaValue: 7, sortOrder: 7 },
  { id: "curso-completo", name: "Formado(a)", description: "Concluiu um curso inteiro", icon: "Trophy", rarity: "legendary", criteriaType: "courses_completed", criteriaValue: 1, sortOrder: 8 },
] as const

/** `lessonOrders`: faixa (inclusiva) de posições do curso que pertencem ao módulo. */
const MODULES = [
  { title: "Fundamentos", description: "Variáveis, operadores, condicionais, laços e funções", icon: "BookOpen", color: "bg-level-purple", sortOrder: 1, lessonOrders: [2, 9] },
  { title: "Orientação a Objetos", description: "Classes, herança, encapsulamento e métodos especiais", icon: "Code2", color: "bg-level-blue", sortOrder: 2, lessonOrders: [10, 13] },
  { title: "Python Avançado", description: "Exceções, context managers, comprehensions, decorators e generators", icon: "Rocket", color: "bg-level-green", sortOrder: 3, lessonOrders: [14, 22] },
  { title: "Certificação", description: "Projeto final do curso", icon: "Trophy", color: "bg-level-orange", sortOrder: 4, lessonOrders: [23, 99] },
] as const

type SeedModule = (typeof MODULES)[number]

const EXAM_QUESTIONS = [
  { prompt: "Qual é o tipo de `3 / 2` em Python 3?", options: ["int", "float", "str", "Decimal"], correctIndex: 1, explanation: "O operador / sempre devolve float; use // para divisão inteira.", topic: "Operadores" },
  { prompt: "O que `len({'a': 1, 'b': 2})` devolve?", options: ["1", "2", "4", "Erro"], correctIndex: 1, explanation: "len de um dicionário conta as chaves.", topic: "Dicionários" },
  { prompt: "Qual palavra-chave cria um gerador dentro de uma função?", options: ["return", "yield", "async", "lambda"], correctIndex: 1, explanation: "Funções com yield devolvem um gerador.", topic: "Generators" },
  { prompt: "Em `class B(A)`, o que `super().__init__()` chama?", options: ["O __init__ de B", "O __init__ de A", "object.__new__", "Nada"], correctIndex: 1, explanation: "super() delega para a classe base na MRO.", topic: "Herança" },
  { prompt: "Qual bloco sempre executa, com ou sem exceção?", options: ["except", "else", "finally", "raise"], correctIndex: 2, explanation: "finally roda em todos os casos.", topic: "Exceções" },
]

interface SeedLesson {
  order: number
  title: string
  description: string
  starter_files: ProjectFile[]
  test_cases: TestCase[]
}

interface SeedUser {
  email: string
  password: string
  fullName: string
  username: string
  role: UserRole
}

function firstRow<T>(rows: T[], table: string): T {
  const [row] = rows
  if (!row) throw new Error(`insert em ${table} não devolveu a linha criada`)
  return row
}

function moduleForOrder(order: number): SeedModule | undefined {
  return MODULES.find(({ lessonOrders: [first, last] }) => order >= first && order <= last)
}

function loadSeedLessons(): SeedLesson[] {
  const seedFile = path.resolve(scriptDir, "../../seed/python-completo.json")
  // Arquivo versionado no repositório; o gabarito é validado pelo `verify:seed` no CI.
  const seed = JSON.parse(readFileSync(seedFile, "utf8")) as { lessons: SeedLesson[] }
  return seed.lessons
}

async function upsertAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) return console.log("· admin: SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD não definidos — pulando")
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) throw new Error(`SEED_ADMIN_PASSWORD precisa de ${MIN_ADMIN_PASSWORD_LENGTH}+ caracteres`)
  await ensureUser({ email, password, fullName: "Administração LevelUSP", username: "admin", role: "admin" })
}

async function ensureUser({ email, password, fullName, username, role }: SeedUser): Promise<string> {
  const existing = await db.query.users.findFirst({ where: sql`lower(${users.email}) = ${email}` })
  if (existing) {
    await db.update(profiles).set({ role }).where(eq(profiles.id, existing.id))
    return existing.id
  }
  const passwordHash = await hash(password, PASSWORD_HASH_OPTIONS)
  const user = firstRow(await db.insert(users).values({ email, passwordHash, emailVerifiedAt: sql`now()` }).returning(), "users")
  await db.insert(profiles).values({ id: user.id, email, fullName, username, role })
  console.log(`· usuário ${role}: ${email}`)
  return user.id
}

/** Id de cada módulo por posição de lição no curso. */
async function ensureModules(): Promise<Map<number, string>> {
  const moduleIdByOrder = new Map<number, string>()
  for (const seedModule of MODULES) {
    const found = await db.query.modules.findFirst({ where: eq(modules.title, seedModule.title) })
    const { lessonOrders, ...values } = seedModule
    const moduleId = found?.id ?? firstRow(await db.insert(modules).values(values).returning(), "modules").id
    const [first, last] = lessonOrders
    for (let order = first; order <= last; order++) moduleIdByOrder.set(order, moduleId)
  }
  return moduleIdByOrder
}

async function seedContent(authorId: string | null): Promise<void> {
  const moduleIdByOrder = await ensureModules()
  if (await db.query.courses.findFirst({ where: eq(courses.title, COURSE_TITLE) })) return console.log("· curso já existe — conteúdo mantido")

  const seedLessons = loadSeedLessons()
  const course = firstRow(
    await db
      .insert(courses)
      .values({
        title: COURSE_TITLE,
        description: "Do zero à orientação a objetos, com exercícios corrigidos automaticamente e certificado.",
        longDescription: "Curso de demonstração gerado a partir dos gabaritos do LevelUSP. O conteúdo teórico completo é importado do banco original.",
        level: "iniciante",
        tags: ["python", "programação", "certificado"],
        estimatedHours: 40,
        published: true,
        createdBy: authorId,
        finalProjectTitle: "Gerenciador de tarefas",
      })
      .returning(),
    "courses",
  )
  for (const [index, seedLesson] of seedLessons.entries()) {
    await db.insert(lessons).values({
      title: seedLesson.title,
      slug: `python-completo-${String(seedLesson.order).padStart(2, "0")}`,
      module: moduleForOrder(seedLesson.order)?.title ?? "",
      moduleId: moduleIdByOrder.get(seedLesson.order) ?? null,
      order: index + 1,
      description: seedLesson.description,
      contentMarkdown: `# ${seedLesson.title}\n\n${seedLesson.description}\n\nLeia o enunciado nos comentários do código, implemente e clique em **Verificar**.`,
      starterCode: seedLesson.starter_files.find((file) => file.path === DEFAULT_ENTRY_FILE)?.content ?? "",
      starterFiles: seedLesson.starter_files,
      testCases: seedLesson.test_cases,
      lessonType: "coding",
      xpReward: seedLesson.order === FINAL_PROJECT_ORDER ? FINAL_PROJECT_XP : LESSON_XP,
      timeLimit: LESSON_STUDY_MINUTES,
      published: true,
      courseId: course.id,
      createdBy: authorId,
    })
  }
  const exam = firstRow(
    await db
      .insert(exams)
      .values({ courseId: course.id, title: "Prova final — Python Completo", description: "Prova de demonstração (5 questões).", passingScore: 70, timeLimitMinutes: 20, cooldownMinutes: 10 })
      .returning(),
    "exams",
  )
  await db.insert(examQuestions).values(EXAM_QUESTIONS.map((question, index) => ({ ...question, examId: exam.id, sortOrder: index })))
  console.log(`· curso "${COURSE_TITLE}" com ${seedLessons.length} lições e prova de demonstração`)
}

async function seedDemoUsers(): Promise<string> {
  const password = process.env.SEED_DEMO_PASSWORD ?? DEFAULT_DEMO_PASSWORD
  const teacherId = await ensureUser({ email: "professora@levelusp.dev", password, fullName: "Professora Demo", username: "professora_demo", role: "teacher" })
  await ensureUser({ email: "aluna@levelusp.dev", password, fullName: "Aluna Demo", username: "aluna_demo", role: "student" })
  return teacherId
}

try {
  for (const badge of BADGES) await db.insert(badges).values(badge).onConflictDoNothing()
  console.log(`· ${BADGES.length} badges`)
  await upsertAdmin()
  const teacherId = process.env.SEED_DEMO_USERS === "true" ? await seedDemoUsers() : null
  if (shouldSeedContent) {
    const admin = await db.query.profiles.findFirst({ where: eq(profiles.role, "admin") })
    await seedContent(teacherId ?? admin?.id ?? null)
  }
  console.log("Seed concluído.")
} finally {
  await close()
}
