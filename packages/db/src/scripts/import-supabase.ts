/**
 * Importa os dados do Supabase (PostgreSQL de origem) para o banco novo.
 *
 *   SOURCE_DATABASE_URL="postgresql://postgres.<projeto>:<senha>@<host>:5432/postgres" \
 *   DATABASE_URL="postgres://levelusp:...@localhost:5432/levelusp" \
 *   pnpm --filter @levelusp/db import:supabase [--dry-run]
 *
 * - Mantém os UUIDs (links de certificado e perfis continuam válidos).
 * - Senhas: copia o hash bcrypt do Supabase Auth; a API aceita bcrypt e troca por
 *   argon2id no próximo login — ninguém precisa redefinir senha.
 * - hidden_tests (texto unittest/assert) vira um caso de teste "legacy"; converta
 *   para casos declarativos com packages/db/tools/convert_legacy_tests.py.
 * - Idempotente: ON CONFLICT DO NOTHING. Rode com o banco novo recém-migrado.
 * - URLs de imagens (avatares/capas) continuam apontando para o Storage do
 *   Supabase até a cópia dos arquivos (ver docs/v2/migracao-dados.md).
 */
import pg from "pg"

const sourceUrl = process.env.SOURCE_DATABASE_URL
const targetUrl = process.env.DATABASE_URL
const isDryRun = process.argv.includes("--dry-run")
if (!sourceUrl || !targetUrl) {
  console.error("Defina SOURCE_DATABASE_URL (Supabase) e DATABASE_URL (banco novo).")
  process.exit(1)
}

type SourceRow = Record<string, unknown>
interface ImportStep {
  table: string
  /** SELECT na origem (colunas já com os nomes do destino). */
  select: string
  transform?: (row: SourceRow) => SourceRow | null
}

const DEFAULT_TIME_LIMIT_MINUTES = 10
const MIN_TIME_LIMIT_MINUTES = 1
const MAX_TIME_LIMIT_MINUTES = 300
const TABLE_NAME_COLUMN_WIDTH = 22
const COUNT_COLUMN_WIDTH = 5

/** hidden_tests (texto) vira um único caso "legacy" no formato declarativo. */
const legacyTests = (code: unknown) => {
  const text = typeof code === "string" ? code.trim() : ""
  return JSON.stringify(text ? [{ id: "legado1", kind: "legacy", name: "Testes do gabarito original", code: text }] : [])
}

/** Ordem respeita as chaves estrangeiras. */
const STEPS: ImportStep[] = [
  {
    table: "users",
    select: `select id, email, encrypted_password as password_hash, email_confirmed_at as email_verified_at,
                    last_sign_in_at, created_at, coalesce(updated_at, created_at) as updated_at
             from auth.users where deleted_at is null`,
    transform: (row) => ({ ...row, password_hash: typeof row.password_hash === "string" && row.password_hash ? row.password_hash : null }),
  },
  {
    table: "profiles",
    select: `select id, email, full_name, username, avatar_url, bio, role, level, total_xp, current_streak, max_streak,
                    courses_completed, lessons_completed, last_login_date, suspended, created_at, updated_at from public.profiles`,
  },
  { table: "modules", select: `select id, title, coalesce(description,'') as description, coalesce(icon,'BookOpen') as icon, coalesce(color,'bg-level-purple') as color, sort_order, coalesce(created_at, now()) as created_at from public.modules` },
  {
    table: "courses",
    select: `select id, title, description, long_description, cover_image_url, level, tags, total_xp, estimated_hours, published,
                    created_by, final_project_title, final_project_description, final_project_starter_code, created_at, updated_at from public.courses`,
  },
  {
    table: "lessons",
    select: `select id, title, slug, module, module_id, "order", difficulty, description, content_markdown, starter_code, starter_files,
                    checkpoints, hidden_tests as test_cases, coalesce(libraries, '{}') as libraries, lesson_type, quiz_passing_score,
                    xp_reward, time_limit, published, course_id, created_by, created_at, updated_at from public.lessons`,
    transform: (row) => ({ ...row, test_cases: legacyTests(row.test_cases), time_limit: clampTimeLimit(row.time_limit) }),
  },
  { table: "lesson_quiz_questions", select: `select id, lesson_id, prompt, options, correct_index, explanation, sort_order, created_at from public.lesson_quiz_questions` },
  { table: "enrollments", select: `select id, user_id, course_id, enrolled_at from public.enrollments` },
  { table: "lesson_progress", select: `select id, user_id, lesson_id, status, code_snapshot, score, xp_earned, completed_at, created_at from public.lesson_progress` },
  { table: "notes", select: `select id, user_id, lesson_id, course_id, title, content, coalesce(created_at, now()) as created_at, coalesce(updated_at, now()) as updated_at from public.notes` },
  { table: "badges", select: `select id, name, description, icon, rarity, criteria_type, criteria_value, sort_order, active, created_at from public.badges` },
  { table: "user_badges", select: `select user_id, badge_id, earned_at from public.user_badges` },
  { table: "exams", select: `select id, course_id, title, description, passing_score, time_limit_minutes, cooldown_minutes, active, created_at from public.exams` },
  { table: "exam_questions", select: `select id, exam_id, prompt, options, correct_index, explanation, topic, sort_order, active, created_at from public.exam_questions` },
  { table: "exam_attempts", select: `select id, exam_id, user_id, question_ids, answers, score, passed, started_at, submitted_at, created_at from public.exam_attempts` },
  { table: "certificates", select: `select id, user_id, course_id, verification_code, exam_score, project_status, issued_at from public.certificates` },
  { table: "notifications", select: `select id, user_id, title, coalesce(body,'') as body, kind, read, href, created_at from public.notifications` },
  { table: "audit_log", select: `select id, actor_id, actor_name, action, target, meta, severity, created_at from public.audit_log` },
  { table: "platform_settings", select: `select key, value, updated_at from public.platform_settings` },
  { table: "teacher_approvals", select: `select id, user_id, name, email, institution, motivation, status, reviewed_by, review_note, submitted_at, reviewed_at, created_at, updated_at from public.teacher_approvals` },
  { table: "library_catalog", select: `select id, name, display_name, description, category, pyodide_native, active, added_by, coalesce(created_at, now()) as created_at from public.library_catalog` },
  { table: "library_requests", select: `select id, requested_by, library_name, display_name, description, use_case, status, reviewed_by, review_notes, coalesce(created_at, now()) as created_at, reviewed_at from public.library_requests` },
]

const JSON_COLUMNS = new Set(["starter_files", "checkpoints", "test_cases", "options", "answers", "meta", "value"])

function clampTimeLimit(value: unknown): number {
  const minutes = Number(value) || DEFAULT_TIME_LIMIT_MINUTES
  return Math.min(Math.max(minutes, MIN_TIME_LIMIT_MINUTES), MAX_TIME_LIMIT_MINUTES)
}

/** O driver não serializa objetos para jsonb sozinho; texto já vem pronto da origem. */
function toColumnValue(column: string, value: unknown): unknown {
  return JSON_COLUMNS.has(column) && value !== null && typeof value !== "string" ? JSON.stringify(value) : value
}

async function importRow(target: pg.Client, table: string, row: SourceRow): Promise<number> {
  const columns = Object.keys(row)
  const values = columns.map((column) => toColumnValue(column, row[column]))
  const quotedColumns = columns.map((column) => `"${column}"`).join(", ")
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ")
  const result = await target.query(`insert into ${table} (${quotedColumns}) values (${placeholders}) on conflict do nothing`, values)
  return result.rowCount ?? 0
}

async function importStep(source: pg.Client, target: pg.Client, step: ImportStep): Promise<void> {
  const { rows } = await source.query<SourceRow>(step.select)
  let insertedCount = 0
  for (const sourceRow of rows) {
    const row = step.transform ? step.transform(sourceRow) : sourceRow
    if (row) insertedCount += await importRow(target, step.table, row)
  }
  console.log(`${step.table.padEnd(TABLE_NAME_COLUMN_WIDTH)} origem=${String(rows.length).padStart(COUNT_COLUMN_WIDTH)}  importadas=${insertedCount}`)
}

async function main(source: pg.Client, target: pg.Client) {
  await source.connect()
  await target.connect()
  try {
    await target.query("begin")
    for (const step of STEPS) await importStep(source, target, step)
    await target.query(`update courses c set total_xp = coalesce((select sum(xp_reward) from lessons l where l.course_id = c.id and l.published), 0)`)
    if (isDryRun) {
      await target.query("rollback")
      console.log("\n--dry-run: nada foi gravado.")
    } else {
      await target.query("commit")
      console.log("\nImportação concluída.")
    }
  } catch (error) {
    await target.query("rollback").catch(() => undefined)
    throw error
  } finally {
    await source.end()
    await target.end()
  }
}

const source = new pg.Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } })
const target = new pg.Client({ connectionString: targetUrl })
main(source, target).catch((error: unknown) => {
  console.error("Falha na importação:", error instanceof Error ? error.message : error)
  process.exit(1)
})
