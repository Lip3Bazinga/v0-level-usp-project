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

const source = process.env.SOURCE_DATABASE_URL
const target = process.env.DATABASE_URL
const dryRun = process.argv.includes("--dry-run")
if (!source || !target) {
  console.error("Defina SOURCE_DATABASE_URL (Supabase) e DATABASE_URL (banco novo).")
  process.exit(1)
}

type Row = Record<string, unknown>
interface Step {
  table: string
  /** SELECT na origem (colunas já com os nomes do destino). */
  select: string
  transform?: (r: Row) => Row | null
}

const legacyTests = (code: unknown) => {
  const text = typeof code === "string" ? code.trim() : ""
  return JSON.stringify(text ? [{ id: "legado1", kind: "legacy", name: "Testes do gabarito original", code: text }] : [])
}

/** Ordem respeita as chaves estrangeiras. */
const STEPS: Step[] = [
  {
    table: "users",
    select: `select id, email, encrypted_password as password_hash, email_confirmed_at as email_verified_at,
                    last_sign_in_at, created_at, coalesce(updated_at, created_at) as updated_at
             from auth.users where deleted_at is null`,
    transform: (r) => ({ ...r, password_hash: typeof r.password_hash === "string" && r.password_hash ? r.password_hash : null }),
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
    transform: (r) => ({ ...r, test_cases: legacyTests(r.test_cases), time_limit: Math.min(Math.max(Number(r.time_limit) || 10, 1), 300) }),
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

async function main() {
  const src = new pg.Client({ connectionString: source, ssl: { rejectUnauthorized: false } })
  const dst = new pg.Client({ connectionString: target })
  await src.connect()
  await dst.connect()
  try {
    await dst.query("begin")
    for (const step of STEPS) {
      const { rows } = await src.query<Row>(step.select)
      let inserted = 0
      for (const raw of rows) {
        const r = step.transform ? step.transform(raw) : raw
        if (!r) continue
        const cols = Object.keys(r)
        const values = cols.map((c) => (JSON_COLUMNS.has(c) && r[c] !== null && typeof r[c] !== "string" ? JSON.stringify(r[c]) : r[c]))
        const sql = `insert into ${step.table} (${cols.map((c) => `"${c}"`).join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) on conflict do nothing`
        const res = await dst.query(sql, values)
        inserted += res.rowCount ?? 0
      }
      console.log(`${step.table.padEnd(22)} origem=${String(rows.length).padStart(5)}  importadas=${inserted}`)
    }
    await dst.query(`update courses c set total_xp = coalesce((select sum(xp_reward) from lessons l where l.course_id = c.id and l.published), 0)`)
    if (dryRun) {
      await dst.query("rollback")
      console.log("\n--dry-run: nada foi gravado.")
    } else {
      await dst.query("commit")
      console.log("\nImportação concluída.")
    }
  } catch (err) {
    await dst.query("rollback").catch(() => undefined)
    throw err
  } finally {
    await src.end()
    await dst.end()
  }
}

main().catch((err) => {
  console.error("Falha na importação:", err instanceof Error ? err.message : err)
  process.exit(1)
})
