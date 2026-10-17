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
import { and, eq, sql } from "drizzle-orm"
import type { ProjectFile, TestCase } from "@levelusp/contracts"
import { createDb } from "../index"
import { badges, courses, exams, examQuestions, lessons, modules, profiles, users } from "../schema/index"

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL não definida")
const here = path.dirname(fileURLToPath(import.meta.url))
const contentOnly = process.env.SEED_CONTENT !== "false"
const { db, close } = createDb(url, { max: 1, applicationName: "levelusp-seed" })

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

const MODULES = [
  { title: "Fundamentos", description: "Variáveis, operadores, condicionais, laços e funções", icon: "BookOpen", color: "bg-level-purple", sortOrder: 1, range: [2, 9] },
  { title: "Orientação a Objetos", description: "Classes, herança, encapsulamento e métodos especiais", icon: "Code2", color: "bg-level-blue", sortOrder: 2, range: [10, 13] },
  { title: "Python Avançado", description: "Exceções, context managers, comprehensions, decorators e generators", icon: "Rocket", color: "bg-level-green", sortOrder: 3, range: [14, 22] },
  { title: "Certificação", description: "Projeto final do curso", icon: "Trophy", color: "bg-level-orange", sortOrder: 4, range: [23, 99] },
] as const

const EXAM_QUESTIONS = [
  { prompt: "Qual é o tipo de `3 / 2` em Python 3?", options: ["int", "float", "str", "Decimal"], correctIndex: 1, explanation: "O operador / sempre devolve float; use // para divisão inteira.", topic: "Operadores" },
  { prompt: "O que `len({'a': 1, 'b': 2})` devolve?", options: ["1", "2", "4", "Erro"], correctIndex: 1, explanation: "len de um dicionário conta as chaves.", topic: "Dicionários" },
  { prompt: "Qual palavra-chave cria um gerador dentro de uma função?", options: ["return", "yield", "async", "lambda"], correctIndex: 1, explanation: "Funções com yield devolvem um gerador.", topic: "Generators" },
  { prompt: "Em `class B(A)`, o que `super().__init__()` chama?", options: ["O __init__ de B", "O __init__ de A", "object.__new__", "Nada"], correctIndex: 1, explanation: "super() delega para a classe base na MRO.", topic: "Herança" },
  { prompt: "Qual bloco sempre executa, com ou sem exceção?", options: ["except", "else", "finally", "raise"], correctIndex: 2, explanation: "finally roda em todos os casos.", topic: "Exceções" },
]

async function upsertAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) return console.log("· admin: SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD não definidos — pulando")
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD precisa de 12+ caracteres")
  await ensureUser(email, password, "Administração LevelUSP", "admin", "admin")
}

async function ensureUser(email: string, password: string, fullName: string, username: string, role: "student" | "teacher" | "admin") {
  const existing = await db.query.users.findFirst({ where: sql`lower(${users.email}) = ${email}` })
  if (existing) {
    await db.update(profiles).set({ role }).where(eq(profiles.id, existing.id))
    return existing.id
  }
  const passwordHash = await hash(password, { algorithm: Algorithm.Argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 })
  const [u] = await db.insert(users).values({ email, passwordHash, emailVerifiedAt: sql`now()` }).returning()
  await db.insert(profiles).values({ id: u!.id, email, fullName, username, role })
  console.log(`· usuário ${role}: ${email}`)
  return u!.id
}

async function seedContent(authorId: string | null) {
  const moduleIds = new Map<number, string>()
  for (const m of MODULES) {
    const found = await db.query.modules.findFirst({ where: eq(modules.title, m.title) })
    const id = found?.id ?? (await db.insert(modules).values({ title: m.title, description: m.description, icon: m.icon, color: m.color, sortOrder: m.sortOrder }).returning())[0]!.id
    for (let o = m.range[0]; o <= m.range[1]; o++) moduleIds.set(o, id)
  }

  const title = "Python Completo"
  if (await db.query.courses.findFirst({ where: eq(courses.title, title) })) return console.log("· curso já existe — conteúdo mantido")

  const data = JSON.parse(readFileSync(path.resolve(here, "../../seed/python-completo.json"), "utf8")) as {
    lessons: { order: number; title: string; description: string; starter_files: ProjectFile[]; test_cases: TestCase[] }[]
  }
  const [course] = await db
    .insert(courses)
    .values({
      title,
      description: "Do zero à orientação a objetos, com exercícios corrigidos automaticamente e certificado.",
      longDescription: "Curso de demonstração gerado a partir dos gabaritos do LevelUSP. O conteúdo teórico completo é importado do banco original.",
      level: "iniciante",
      tags: ["python", "programação", "certificado"],
      estimatedHours: 40,
      published: true,
      createdBy: authorId,
      finalProjectTitle: "Gerenciador de tarefas",
    })
    .returning()
  let position = 1
  for (const l of data.lessons) {
    const mod = MODULES.find((m) => l.order >= m.range[0] && l.order <= m.range[1])!
    await db.insert(lessons).values({
      title: l.title,
      slug: `python-completo-${String(l.order).padStart(2, "0")}`,
      module: mod.title,
      moduleId: moduleIds.get(l.order) ?? null,
      order: position++,
      description: l.description,
      contentMarkdown: `# ${l.title}\n\n${l.description}\n\nLeia o enunciado nos comentários do código, implemente e clique em **Verificar**.`,
      starterCode: l.starter_files.find((f) => f.path === "main.py")?.content ?? "",
      starterFiles: l.starter_files,
      testCases: l.test_cases,
      lessonType: "coding",
      xpReward: l.order === 24 ? 300 : 100,
      timeLimit: 30,
      published: true,
      courseId: course!.id,
      createdBy: authorId,
    })
  }
  const [exam] = await db
    .insert(exams)
    .values({ courseId: course!.id, title: "Prova final — Python Completo", description: "Prova de demonstração (5 questões).", passingScore: 70, timeLimitMinutes: 20, cooldownMinutes: 10 })
    .returning()
  await db.insert(examQuestions).values(EXAM_QUESTIONS.map((q, i) => ({ ...q, examId: exam!.id, sortOrder: i })))
  console.log(`· curso "${title}" com ${data.lessons.length} lições e prova de demonstração`)
}

try {
  for (const b of BADGES) await db.insert(badges).values(b).onConflictDoNothing()
  console.log(`· ${BADGES.length} badges`)
  await upsertAdmin()
  let teacherId: string | null = null
  if (process.env.SEED_DEMO_USERS === "true") {
    const pwd = process.env.SEED_DEMO_PASSWORD ?? "demonstracao123"
    teacherId = await ensureUser("professora@levelusp.dev", pwd, "Professora Demo", "professora_demo", "teacher")
    await ensureUser("aluna@levelusp.dev", pwd, "Aluna Demo", "aluna_demo", "student")
  }
  if (contentOnly) {
    const admin = await db.query.profiles.findFirst({ where: and(eq(profiles.role, "admin")) })
    await seedContent(teacherId ?? admin?.id ?? null)
  }
  console.log("Seed concluído.")
} finally {
  await close()
}
