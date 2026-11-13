import { readFileSync } from "node:fs"
import path from "node:path"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq, sql } from "drizzle-orm"
import { badges, courses, examQuestions, exams, lessonSteps, lessons, modules, profiles, trackCourses, tracks, type LessonStepRow } from "@levelusp/db"
import type {
  ApiErrorBody, CertificateIssue, CertificateVerification, ContentImportSummary, ExamStart, HintReveal, Lesson, LessonStepsProgress, LessonWithTests,
  SessionResponse, SolutionReveal, StepCompleteResult, StepQuizResult, StepSubmitResult, TestCase, TrackCertificateIssue, TrackWithCourses,
} from "@levelusp/contracts"
import { ServiceUnavailable } from "@/common/errors/app-error"
import { requireRow } from "@/common/database/rows"
import { agent, bodyOf, countRows, createLesson, createTestApp, queryRows, required, signUp, type SignedUpUser, type TestContext } from "./harness"
import { answersFor, drawnQuestionIds } from "./exam-fixtures"

/** Marcadores que só existem no gabarito: se aparecerem numa resposta ao aluno, vazaram. */
const SECRET_SOLUTION = "SOLUCAO_SECRETA_DO_PASSO"
const SECRET_HINT_1 = "DICA_SECRETA_UM"
const SECRET_HINT_2 = "DICA_SECRETA_DOIS"
const SECRET_CASE_HINT = "DICA_DO_CASO_SECRETA"
const SECRET_EXPLANATION = "EXPLICACAO_SECRETA_DO_QUIZ"

const files = [{ path: "main.py", content: "def soma(a, b):\n    return a + b\n" }]
const cases: TestCase[] = [
  { id: "c1", kind: "call", function: "soma", args: [2, 3], kwargs: {}, expected: 5, hint: SECRET_CASE_HINT, checkpoint: 1, name: "Soma 2 + 3" },
]

const LESSON_XP = 100
const STEP_XP = 10

interface GuidedFixture {
  trackId: string
  trackSlug: string
  courseId: string
  lessonId: string
  reading: LessonStepRow
  exercise: LessonStepRow
  quiz: LessonStepRow
  answerKey: Map<string, number>
}

describe("Lição guiada em passos, trilha e certificados (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp({ PUBLIC_BASE_URL: "https://levelusp.teste.example" })
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  /** Trilha → curso com prova → módulo → lição guiada (leitura, exercício, quiz). */
  async function seedGuided(): Promise<GuidedFixture> {
    const course = requireRow(await ctx.db.insert(courses).values({ title: "Nível 1", slug: "n1-teste", published: true }).returning(), "courses")
    const module = requireRow(await ctx.db.insert(modules).values({ title: "Módulo 1", courseId: course.id, slug: "m1" }).returning(), "modules")
    const lesson = await createLesson(ctx.db, {
      title: "Lição guiada", courseId: course.id, moduleId: module.id, lessonType: "guided", xpReward: LESSON_XP, solutionAfterAttempts: 3, quizPassingScore: 70,
    })
    const [reading, exercise, quiz] = await ctx.db
      .insert(lessonSteps)
      .values([
        { lessonId: lesson.id, order: 1, kind: "leitura", title: "O que é somar", narrativeMarkdown: "Texto da leitura.", xp: STEP_XP },
        {
          lessonId: lesson.id, order: 2, kind: "exercicio", title: "Escreva soma", narrativeMarkdown: "Faça a função.", xp: STEP_XP,
          starterFiles: [{ path: "main.py", content: "# seu código\n" }],
          solutionFiles: [{ path: "main.py", content: `# ${SECRET_SOLUTION}\ndef soma(a, b):\n    return a + b\n` }],
          checkpoints: [{ id: 1, instruction: "Defina soma(a, b)." }],
          testCases: cases,
          hints: [SECRET_HINT_1, SECRET_HINT_2],
        },
        {
          lessonId: lesson.id, order: 3, kind: "quiz", title: "Fixando", xp: STEP_XP,
          quizQuestions: [
            { prompt: "1+1?", options: ["1", "2", "3"], correct_index: 1, explanation: SECRET_EXPLANATION },
            { prompt: "2+2?", options: ["4", "5", "6"], correct_index: 0, explanation: SECRET_EXPLANATION },
          ],
        },
      ])
      .returning()
    const exam = requireRow(
      await ctx.db.insert(exams).values({ courseId: course.id, title: "Prova", description: "", passingScore: 70, timeLimitMinutes: 45, cooldownMinutes: 0 }).returning(),
      "exams",
    )
    const answerKey = new Map<string, number>()
    for (let index = 0; index < 4; index++) {
      const question = requireRow(
        await ctx.db.insert(examQuestions).values({ examId: exam.id, prompt: `Q${index}`, options: ["a", "b", "c", "d"], correctIndex: index % 3, sortOrder: index }).returning(),
        "exam_questions",
      )
      answerKey.set(question.id, index % 3)
    }
    const track = requireRow(
      await ctx.db.insert(tracks).values({ slug: "trilha-teste", title: "Trilha de teste", published: true, certificateTitle: "Python: do zero à IA" }).returning(),
      "tracks",
    )
    await ctx.db.insert(trackCourses).values({ trackId: track.id, courseId: course.id, position: 1 })
    return {
      trackId: track.id, trackSlug: track.slug, courseId: course.id, lessonId: lesson.id,
      reading: required(reading, "passo de leitura"), exercise: required(exercise, "passo de exercício"), quiz: required(quiz, "passo de quiz"), answerKey,
    }
  }

  const stepUrl = (fixture: GuidedFixture, step: LessonStepRow, action: string): string => `/api/me/lessons/${fixture.lessonId}/steps/${step.id}/${action}`

  function passNextSubmissions(): void {
    ctx.runner.respond((job) => job.probes.map((probe) => ({ id: probe.id, ok: true, value: 5, type: "int" })))
  }

  function failNextSubmissions(): void {
    ctx.runner.respond((job) => job.probes.map((probe) => ({ id: probe.id, ok: true, value: 999, type: "int" })))
  }

  async function totalXp(student: SignedUpUser): Promise<number> {
    return bodyOf<SessionResponse>(await student.agent.get("/api/auth/me")).user.total_xp
  }

  /** Percorre a lição inteira pelo caminho feliz. */
  async function finishLesson(fixture: GuidedFixture, student: SignedUpUser): Promise<void> {
    passNextSubmissions()
    expect((await student.agent.post(stepUrl(fixture, fixture.reading, "complete"))).status).toBe(200)
    expect((await student.agent.post(stepUrl(fixture, fixture.exercise, "submit"), { files })).status).toBe(200)
    expect((await student.agent.post(stepUrl(fixture, fixture.quiz, "quiz"), { answers: [1, 0] })).status).toBe(200)
  }

  it("GET /lessons/:id traz os passos sem solução, casos, dicas, gabarito nem autor", async () => {
    const fixture = await seedGuided()
    const response = await agent(ctx.app).get(`/api/lessons/${fixture.lessonId}`)
    expect(response.status).toBe(200)
    const lesson = bodyOf<Lesson>(response)
    expect(lesson.steps.map((step) => [step.order, step.kind])).toEqual([[1, "leitura"], [2, "exercicio"], [3, "quiz"]])
    expect(lesson.steps[1]).toMatchObject({ test_case_count: 1, hint_count: 2, checkpoints: [{ id: 1, instruction: "Defina soma(a, b)." }] })
    expect(lesson.steps[2]?.quiz_questions).toEqual([{ prompt: "1+1?", options: ["1", "2", "3"] }, { prompt: "2+2?", options: ["4", "5", "6"] }])

    const serialized = JSON.stringify(response.body)
    for (const secret of [SECRET_SOLUTION, SECRET_HINT_1, SECRET_CASE_HINT, SECRET_EXPLANATION]) expect(serialized).not.toContain(secret)
    for (const field of ["solution_files", "test_cases", "correct_index", "explanation", "expected", "created_by", "hints\""]) expect(serialized).not.toContain(field)
  })

  it("passos são sequenciais e cada tipo só aceita a própria ação", async () => {
    const fixture = await seedGuided()
    const student = await signUp(ctx.app)
    const locked = await student.agent.post(stepUrl(fixture, fixture.exercise, "submit"), { files })
    expect(locked.status).toBe(409)
    expect(bodyOf<ApiErrorBody>(locked)).toMatchObject({ code: "STEP_LOCKED", message: expect.stringContaining("passo 1") as unknown })
    expect((await student.agent.post(stepUrl(fixture, fixture.quiz, "quiz"), { answers: [1, 0] })).status).toBe(409)
    expect(ctx.runner.jobs).toHaveLength(0)

    const wrongKind = await student.agent.post(stepUrl(fixture, fixture.reading, "submit"), { files })
    expect(bodyOf<ApiErrorBody>(wrongKind)).toMatchObject({ code: "WRONG_STEP_KIND" })
    expect(wrongKind.status).toBe(400)

    // Passo de outra lição não é encontrado nesta.
    const other = await createLesson(ctx.db, { lessonType: "guided" })
    expect((await student.agent.post(`/api/me/lessons/${other.id}/steps/${fixture.reading.id}/complete`)).status).toBe(404)
  })

  it("leitura concluída credita o XP do passo uma única vez, matricula e conta o dia na sequência", async () => {
    const fixture = await seedGuided()
    const student = await signUp(ctx.app)
    const first = await student.agent.post(stepUrl(fixture, fixture.reading, "complete"))
    expect(first.status).toBe(200)
    expect(bodyOf<StepCompleteResult>(first)).toMatchObject({ step_id: fixture.reading.id, step_completed: true, xp_awarded: STEP_XP, lesson_completed: false })
    const again = await student.agent.post(stepUrl(fixture, fixture.reading, "complete"))
    expect(bodyOf<StepCompleteResult>(again)).toMatchObject({ xp_awarded: 0, lesson_completed: false })

    const me = bodyOf<SessionResponse>(await student.agent.get("/api/auth/me")).user
    expect(me).toMatchObject({ total_xp: STEP_XP, lessons_completed: 0, current_streak: 1 })
    expect((await student.agent.get("/api/me/enrollments")).body).toEqual([fixture.courseId])

    const progress = bodyOf<LessonStepsProgress>(await student.agent.get(`/api/me/lessons/${fixture.lessonId}/progress`))
    expect(progress).toMatchObject({ lesson_id: fixture.lessonId, status: "in_progress" })
    expect(progress.steps).toEqual([expect.objectContaining({ step_id: fixture.reading.id, status: "completed", xp_awarded: STEP_XP, attempts: 0 })])
  })

  it("exercício: erro → dica → solução só após 3 tentativas → aprovação com metade do XP", async () => {
    const fixture = await seedGuided()
    const student = await signUp(ctx.app)
    await student.agent.post(stepUrl(fixture, fixture.reading, "complete"))

    // Solução trancada antes das tentativas.
    const early = await student.agent.post(stepUrl(fixture, fixture.exercise, "solution"))
    expect(early.status).toBe(403)
    expect(bodyOf<ApiErrorBody>(early)).toMatchObject({ code: "SOLUTION_LOCKED" })
    expect(JSON.stringify(early.body)).not.toContain(SECRET_SOLUTION)

    failNextSubmissions()
    for (let attempt = 1; attempt <= 3; attempt++) {
      const failed = await student.agent.post(stepUrl(fixture, fixture.exercise, "submit"), { files })
      expect(failed.status).toBe(200)
      const result = bodyOf<StepSubmitResult>(failed)
      expect(result).toMatchObject({ passed: false, step_completed: false, xp_awarded: 0, attempts: attempt, solution_available: attempt >= 3 })
      // O caso reprovado mostra a dica do professor e a instrução que cobre; nunca o valor esperado.
      expect(result.cases).toEqual([expect.objectContaining({ id: "c1", passed: false, hint: SECRET_CASE_HINT, checkpoint: 1 })])
      expect(JSON.stringify(failed.body)).not.toContain(SECRET_SOLUTION)
    }
    // O executor recebe as entradas do passo, nunca o valor esperado.
    expect(JSON.stringify(ctx.runner.jobs[0])).not.toContain("expected")

    // Dicas: uma por vez, depois 409.
    const hint1 = bodyOf<HintReveal>(await student.agent.post(stepUrl(fixture, fixture.exercise, "hint")))
    expect(hint1).toEqual({ index: 0, text: SECRET_HINT_1 })
    const hint2 = bodyOf<HintReveal>(await student.agent.post(stepUrl(fixture, fixture.exercise, "hint")))
    expect(hint2).toEqual({ index: 1, text: SECRET_HINT_2 })
    const noMore = await student.agent.post(stepUrl(fixture, fixture.exercise, "hint"))
    expect(noMore.status).toBe(409)
    expect(bodyOf<ApiErrorBody>(noMore)).toMatchObject({ code: "NO_MORE_HINTS" })
    expect((await student.agent.get(stepUrl(fixture, fixture.exercise, "hints"))).body).toEqual([hint1, hint2])

    // Solução liberada: ver marca solution_viewed.
    const solution = await student.agent.post(stepUrl(fixture, fixture.exercise, "solution"))
    expect(solution.status).toBe(200)
    expect(bodyOf<SolutionReveal>(solution).files[0]?.content).toContain(SECRET_SOLUTION)

    passNextSubmissions()
    const passed = bodyOf<StepSubmitResult>(await student.agent.post(stepUrl(fixture, fixture.exercise, "submit"), { files }))
    expect(passed).toMatchObject({ passed: true, step_completed: true, xp_awarded: STEP_XP / 2, lesson_completed: false, attempts: 3 })
    expect(passed.cases).toEqual([expect.objectContaining({ passed: true, hint: null, checkpoint: 1 })])
    expect(await totalXp(student)).toBe(STEP_XP + STEP_XP / 2)

    const progress = bodyOf<LessonStepsProgress>(await student.agent.get(`/api/me/lessons/${fixture.lessonId}/progress`))
    expect(progress.steps.find((step) => step.step_id === fixture.exercise.id)).toMatchObject({
      status: "completed", attempts: 3, hints_revealed: 2, solution_viewed: true, xp_awarded: STEP_XP / 2,
    })
    expect(await countRows(ctx.db, sql`select count(*)::int as n from submissions where step_id = ${fixture.exercise.id}`)).toBe(4)
  })

  it("falha do executor responde 503, grava status error e não conta como tentativa", async () => {
    const fixture = await seedGuided()
    const student = await signUp(ctx.app)
    await student.agent.post(stepUrl(fixture, fixture.reading, "complete"))
    ctx.runner.failNext(ServiceUnavailable("O corretor está indisponível no momento.", "RUNNER_UNREACHABLE"), 4)
    for (let i = 0; i < 4; i++) {
      const down = await student.agent.post(stepUrl(fixture, fixture.exercise, "submit"), { files })
      expect(down.status).toBe(503)
      expect(bodyOf<ApiErrorBody>(down).message).toBe("O corretor está indisponível no momento.")
    }
    expect(await countRows(ctx.db, sql`select count(*)::int as n from submissions where status = 'error' and step_id = ${fixture.exercise.id}`)).toBe(4)
    const progress = bodyOf<LessonStepsProgress>(await student.agent.get(`/api/me/lessons/${fixture.lessonId}/progress`))
    expect(progress.steps.find((step) => step.step_id === fixture.exercise.id)?.attempts ?? 0).toBe(0)
    // Quatro falhas de infraestrutura não liberam a solução.
    expect((await student.agent.post(stepUrl(fixture, fixture.exercise, "solution"))).status).toBe(403)
  })

  it("quiz: reprovação não entrega respostas; aprovação fecha a lição e o curso", async () => {
    const fixture = await seedGuided()
    const student = await signUp(ctx.app)
    passNextSubmissions()
    await student.agent.post(stepUrl(fixture, fixture.reading, "complete"))
    await student.agent.post(stepUrl(fixture, fixture.exercise, "submit"), { files })

    const failed = await student.agent.post(stepUrl(fixture, fixture.quiz, "quiz"), { answers: [1, 2] })
    expect(bodyOf<StepQuizResult>(failed)).toMatchObject({ passed: false, score: 50, passing_score: 70, correct_count: 1, total: 2, step_completed: false })
    expect(bodyOf<StepQuizResult>(failed).review).toEqual([
      { index: 0, correct: true, explanation: SECRET_EXPLANATION },
      { index: 1, correct: false, explanation: "" },
    ])
    expect(JSON.stringify(failed.body)).not.toContain("correct_index")

    const passed = bodyOf<StepQuizResult>(await student.agent.post(stepUrl(fixture, fixture.quiz, "quiz"), { answers: [1, 0] }))
    expect(passed).toMatchObject({ passed: true, score: 100, step_completed: true, lesson_completed: true, xp_awarded: STEP_XP + LESSON_XP })
    const me = bodyOf<SessionResponse>(await student.agent.get("/api/auth/me")).user
    expect(me).toMatchObject({ total_xp: 3 * STEP_XP + LESSON_XP, lessons_completed: 1, courses_completed: 1 })
    expect((await student.agent.get("/api/me/progress/completed")).body).toEqual([fixture.lessonId])
    expect(await countRows(ctx.db, sql`select count(*)::int as n from course_completions where user_id = ${student.id}`)).toBe(1)

    // Reenviar depois de concluir não credita de novo.
    const again = bodyOf<StepQuizResult>(await student.agent.post(stepUrl(fixture, fixture.quiz, "quiz"), { answers: [1, 0] }))
    expect(again).toMatchObject({ passed: true, xp_awarded: 0, lesson_completed: false })
    expect(await totalXp(student)).toBe(3 * STEP_XP + LESSON_XP)
  })

  it("ponta a ponta: lição → prova → certificado do curso → badge Formado(a) → certificado da trilha", async () => {
    const fixture = await seedGuided()
    await ctx.db.insert(badges).values({ id: "formado", name: "Formado(a)", description: "Emitiu um certificado", criteriaType: "certificates_issued", criteriaValue: 1 })
    const student = await signUp(ctx.app)

    const before = bodyOf<TrackWithCourses>(await student.agent.get(`/api/tracks/${fixture.trackSlug}`))
    expect(before.courses.map((course) => [course.position, course.student_status])).toEqual([[1, "available"]])
    // Sem as lições, nem prova nem certificado de trilha.
    expect((await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)).status).toBe(403)
    const tooSoon = await student.agent.post(`/api/me/tracks/${fixture.trackId}/certificate`)
    expect(tooSoon.status).toBe(403)
    expect(bodyOf<ApiErrorBody>(tooSoon)).toMatchObject({ code: "NOT_ELIGIBLE" })

    await student.agent.post(stepUrl(fixture, fixture.reading, "complete"))
    expect(bodyOf<TrackWithCourses>(await student.agent.get(`/api/tracks/${fixture.trackSlug}`)).courses[0]?.student_status).toBe("in_progress")
    await finishLesson(fixture, student)
    expect(bodyOf<TrackWithCourses>(await student.agent.get(`/api/tracks/${fixture.trackSlug}`)).courses[0]?.student_status).toBe("completed")

    const attempt = bodyOf<ExamStart>(await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`))
    const answers = answersFor(drawnQuestionIds(attempt), fixture.answerKey, true)
    expect((await student.agent.post(`/api/courses/${fixture.courseId}/exam/submit`, { attemptId: attempt.attemptId, answers })).body).toMatchObject({ passed: true })

    const issued = bodyOf<CertificateIssue>(await student.agent.post(`/api/courses/${fixture.courseId}/certificate`))
    expect(issued).toMatchObject({ issued: true, alreadyIssued: false })
    expect(await countRows(ctx.db, sql`select count(*)::int as n from user_badges where user_id = ${student.id} and badge_id = 'formado'`)).toBe(1)
    expect(bodyOf<TrackWithCourses>(await student.agent.get(`/api/tracks/${fixture.trackSlug}`)).courses[0]?.student_status).toBe("certified")

    const trackIssue = await student.agent.post(`/api/me/tracks/${fixture.trackId}/certificate`)
    expect(trackIssue.status).toBe(200)
    const trackCertificate = bodyOf<TrackCertificateIssue>(trackIssue)
    expect(trackCertificate).toMatchObject({ issued: true, already_issued: false })
    expect(trackCertificate.verification_code).toMatch(/^TRL-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    const again = bodyOf<TrackCertificateIssue>(await student.agent.post(`/api/me/tracks/${fixture.trackId}/certificate`))
    expect(again).toMatchObject({ already_issued: true, verification_code: trackCertificate.verification_code })
    expect((await student.agent.get("/api/me/track-certificates")).body).toEqual([
      expect.objectContaining({ track_id: fixture.trackId, certificate_title: "Python: do zero à IA", verification_code: trackCertificate.verification_code }),
    ])

    // Verificação pública do código da trilha, sem login e sem e-mail.
    const verify = await agent(ctx.app).get(`/api/certificates/${trackCertificate.verification_code}`)
    expect(bodyOf<CertificateVerification>(verify)).toMatchObject({ valid: true, kind: "track", course_title: "Python: do zero à IA", exam_score: null })
    expect(JSON.stringify(verify.body)).not.toContain(student.email)
    const pdf = await agent(ctx.app).get(`/api/certificates/${trackCertificate.verification_code}/pdf`)
    expect(pdf.status).toBe(200)
    expect(pdf.headers["content-type"]).toBe("application/pdf")

    // Eventos do experimento registrados pelo servidor ao longo do caminho.
    const recorded = await queryRows<{ type: string }>(ctx.db, sql`select distinct type from events where user_id = ${student.id}`)
    expect(recorded.map((event) => event.type).sort()).toEqual(
      ["certificate_issued", "exam_started", "exam_submitted", "lesson_completed", "login", "quiz_answered", "step_completed", "step_submitted"].sort(),
    )
  })

  it("trilha: pré-requisito sem certificado trava o curso seguinte; rascunho só para admin", async () => {
    const fixture = await seedGuided()
    const next = requireRow(
      await ctx.db.insert(courses).values({ title: "Nível 2", slug: "n2-teste", published: true, prerequisiteCourseId: fixture.courseId }).returning(),
      "courses",
    )
    await ctx.db.insert(trackCourses).values({ trackId: fixture.trackId, courseId: next.id, position: 2 })
    const anonymous = bodyOf<TrackWithCourses>(await agent(ctx.app).get(`/api/tracks/${fixture.trackSlug}`))
    expect(anonymous.courses.map((course) => course.student_status)).toEqual(["available", "locked"])
    expect((await agent(ctx.app).get("/api/tracks")).body).toEqual([expect.objectContaining({ slug: fixture.trackSlug, course_count: 2 })])

    await ctx.db.update(tracks).set({ published: false }).where(eq(tracks.id, fixture.trackId))
    expect((await agent(ctx.app).get(`/api/tracks/${fixture.trackSlug}`)).status).toBe(404)
    expect((await agent(ctx.app).get("/api/tracks")).body).toEqual([])
    const admin = await signUp(ctx.app, "admin", ctx.db)
    expect((await admin.agent.get(`/api/tracks/${fixture.trackSlug}`)).status).toBe(200)
  })

  it("admin cria, edita e apaga trilha; slug repetido e curso inexistente são recusados", async () => {
    const fixture = await seedGuided()
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const created = await admin.agent.post("/api/admin/tracks", { slug: "dados", title: "Trilha de dados", course_ids: [fixture.courseId] })
    expect(created.status).toBe(201)
    const track = bodyOf<TrackWithCourses>(created)
    expect(track).toMatchObject({ slug: "dados", published: false })
    expect(track.courses.map((course) => course.id)).toEqual([fixture.courseId])

    expect((await admin.agent.post("/api/admin/tracks", { slug: "dados", title: "Outra trilha" })).status).toBe(409)
    const ghost = await admin.agent.patch(`/api/admin/tracks/${track.id}`, { course_ids: ["00000000-0000-4000-8000-000000000000"] })
    expect(bodyOf<ApiErrorBody>(ghost)).toMatchObject({ code: "INVALID_COURSE" })

    const updated = await admin.agent.patch(`/api/admin/tracks/${track.id}`, { published: true, course_ids: [] })
    expect(bodyOf<TrackWithCourses>(updated)).toMatchObject({ published: true, title: "Trilha de dados", courses: [] })
    expect((await admin.agent.delete(`/api/admin/tracks/${track.id}`)).status).toBe(204)
    expect((await admin.agent.get("/api/admin/tracks")).body).toEqual([expect.objectContaining({ slug: fixture.trackSlug })])
  })

  it("projeto do nível só abre depois das demais lições do curso", async () => {
    const fixture = await seedGuided()
    const project = await createLesson(ctx.db, { title: "Projeto", courseId: fixture.courseId, lessonType: "guided", isProject: true })
    const [projectStep] = await ctx.db.insert(lessonSteps).values({ lessonId: project.id, order: 1, kind: "leitura", title: "Enunciado" }).returning()
    const student = await signUp(ctx.app)
    const url = `/api/me/lessons/${project.id}/steps/${required(projectStep, "passo do projeto").id}/complete`
    const locked = await student.agent.post(url)
    expect(locked.status).toBe(403)
    expect(bodyOf<ApiErrorBody>(locked)).toMatchObject({ code: "PROJECT_LOCKED", message: expect.stringContaining("faltam 1") as unknown })

    await finishLesson(fixture, student)
    // A prova já está liberada (não exige o projeto), mas o certificado exige.
    expect((await student.agent.post(`/api/courses/${fixture.courseId}/exam/attempts`)).status).toBe(200)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from course_completions`)).toBe(0)
    expect((await student.agent.post(url)).status).toBe(200)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from course_completions`)).toBe(1)
  })

  it("professor grava passos pela API, vê o gabarito na autoria e a prévia não dá XP", async () => {
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const steps = [
      { order: 1, kind: "leitura", title: "Leia", narrative_markdown: "Olá" },
      { order: 2, kind: "exercicio", title: "Faça", checkpoints: [{ id: 1, instruction: "Defina soma." }], test_cases: cases, solution_files: [{ path: "main.py", content: SECRET_SOLUTION }], hints: [SECRET_HINT_1] },
    ]
    const created = await teacher.agent.post("/api/lessons", { title: "Guiada do professor", lesson_type: "guided", steps })
    expect(created.status).toBe(201)
    const authored = bodyOf<LessonWithTests>(created)
    expect(authored.steps).toHaveLength(2)
    expect(authored.authoring_steps[1]).toMatchObject({ hints: [SECRET_HINT_1], solution_files: [{ path: "main.py", content: SECRET_SOLUTION }] })
    expect(JSON.stringify(authored.steps)).not.toContain(SECRET_SOLUTION)

    // Trocar os passos mantém o id do que continua na mesma posição (o progresso aponta para ele).
    const patched = bodyOf<LessonWithTests>(await teacher.agent.patch(`/api/lessons/${authored.id}`, { steps: [steps[0]] }))
    expect(patched.steps.map((step) => step.id)).toEqual([authored.steps[0]?.id])

    // Lição guiada publicada não pode ficar sem passos.
    expect((await teacher.agent.patch(`/api/lessons/${authored.id}/publish`, { published: true })).status).toBe(200)
    expect(bodyOf<ApiErrorBody>(await teacher.agent.patch(`/api/lessons/${authored.id}`, { steps: [] }))).toMatchObject({ code: "NO_STEPS" })

    // Rascunho de outra lição: a prévia do professor conclui o passo sem XP; aluno nem enxerga.
    const draft = bodyOf<LessonWithTests>(await teacher.agent.post("/api/lessons", { title: "Rascunho guiado", lesson_type: "guided", steps }))
    const stepId = required(draft.steps[0], "passo do rascunho").id
    const preview = bodyOf<StepCompleteResult>(await teacher.agent.post(`/api/me/lessons/${draft.id}/steps/${stepId}/complete`))
    expect(preview).toMatchObject({ step_completed: true, xp_awarded: 0 })
    expect(await totalXp(teacher)).toBe(0)
    const student = await signUp(ctx.app)
    expect((await student.agent.post(`/api/me/lessons/${draft.id}/steps/${stepId}/complete`)).status).toBe(404)
    expect((await student.agent.get(`/api/lessons/${draft.id}/authoring`)).status).toBe(403)
  })

  it("experimento: eventos do cliente, grupo do participante e exportação CSV só para admin", async () => {
    const student = await signUp(ctx.app)
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const sent = await student.agent.post("/api/me/events", { events: [{ type: "lesson_viewed", payload: { lesson_id: "abc", note: '=cmd,"x"' } }] })
    expect(sent.status).toBe(204)
    // Tipo fora da lista fechada e tentativa de escolher o usuário são recusados/ignorados.
    expect((await student.agent.post("/api/me/events", { events: [{ type: "xp_granted", payload: {} }] })).status).toBe(400)
    await student.agent.post("/api/me/events", { events: [{ type: "lesson_viewed", user_id: admin.id, created_at: "2000-01-01T00:00:00Z" }] })
    expect(await countRows(ctx.db, sql`select count(*)::int as n from events where user_id = ${admin.id} and type = 'lesson_viewed'`)).toBe(0)

    expect((await student.agent.patch(`/api/admin/users/${student.id}/experiment-condition`, { experiment_condition: "gamificada" })).status).toBe(403)
    expect((await admin.agent.patch(`/api/admin/users/${student.id}/experiment-condition`, { experiment_condition: "controle" })).status).toBe(204)
    expect(bodyOf<SessionResponse>(await student.agent.get("/api/auth/me")).user.experiment_condition).toBe("controle")
    // O grupo não aparece no perfil público.
    const stored = required(await ctx.db.query.profiles.findFirst({ where: eq(profiles.id, student.id) }), "perfil")
    const publicProfile = await agent(ctx.app).get(`/api/users/by-username/${required(stored.username, "username")}`)
    expect(JSON.stringify(publicProfile.body)).not.toContain("experiment_condition")

    expect((await student.agent.get("/api/admin/experiment/export.csv")).status).toBe(403)
    const exported = await admin.agent.get("/api/admin/experiment/export.csv")
    expect(exported.status).toBe(200)
    expect(exported.headers["content-type"]).toContain("text/csv")
    const lines = exported.text.trim().split("\n")
    expect(lines[0]).toBe("id,user_id,experiment_condition,type,created_at,payload")
    const viewed = required(lines.find((line) => line.includes("lesson_viewed") && line.includes("abc")), "linha do evento")
    expect(viewed).toContain(`${student.id},controle,lesson_viewed`)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from audit_log where action = 'experiment.export'`)).toBe(1)
  })

  it("mapa de atividade só para o próprio usuário, professor ou admin; readiness 503 sem detalhes", async () => {
    const student = await signUp(ctx.app)
    const other = await signUp(ctx.app)
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    expect((await student.agent.get(`/api/users/${student.id}/activity`)).status).toBe(200)
    expect((await teacher.agent.get(`/api/users/${student.id}/activity`)).status).toBe(200)
    expect((await other.agent.get(`/api/users/${student.id}/activity`)).status).toBe(403)
    expect((await agent(ctx.app).get(`/api/users/${student.id}/activity`)).status).toBe(401)

    expect((await agent(ctx.app).get("/api/health/ready")).status).toBe(200)
    ctx.runner.isHealthy = false
    const degraded = await agent(ctx.app).get("/api/health/ready")
    expect(degraded.status).toBe(503)
    expect(degraded.body).toMatchObject({ status: "degraded", checks: { db: true, runner: false } })
    expect(JSON.stringify(degraded.body)).not.toMatch(/error|stack|ECONN|postgres:/i)
  })

  it("importa o pacote real de conteúdo duas vezes sem duplicar nem trocar ids; só admin", async () => {
    const bundle: unknown = JSON.parse(readFileSync(path.resolve(process.cwd(), "../../packages/db/seed/trilha-python-ia.json"), "utf8"))
    const admin = await signUp(ctx.app, "admin", ctx.db)
    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    expect((await teacher.agent.post("/api/admin/content/import", { format: 2, courses: [] })).status).toBe(403)
    expect((await admin.agent.post("/api/admin/content/import", { format: 1, courses: [] })).status).toBe(400)

    const first = await admin.agent.post("/api/admin/content/import", bundle as object)
    expect(first.status).toBe(200)
    const summary = bodyOf<ContentImportSummary>(first)
    expect(summary).toMatchObject({ tracks: 1, courses: 7 })
    expect(summary.lessons).toBeGreaterThan(200)
    const idsBefore = await queryRows<{ id: string }>(ctx.db, sql`select id from lesson_steps order by id`)

    const second = await admin.agent.post("/api/admin/content/import", bundle as object)
    expect(bodyOf<ContentImportSummary>(second)).toEqual(summary)
    expect(await queryRows<{ id: string }>(ctx.db, sql`select id from lesson_steps order by id`)).toEqual(idsBefore)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from lessons`)).toBe(summary.lessons)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from courses`)).toBe(7)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from audit_log where action = 'content.import'`)).toBe(2)

    // O conteúdo importado sai para o aluno sem gabarito.
    const guided = required(await ctx.db.query.lessons.findFirst({ where: eq(lessons.slug, "n1-m6-01-definir-e-chamar") }), "lição escrita do N1")
    const lesson = await agent(ctx.app).get(`/api/lessons/${guided.id}`)
    expect(bodyOf<Lesson>(lesson).steps.length).toBeGreaterThan(1)
    for (const field of ["solution_files", "test_cases", "correct_index", "wrong_solutions"]) expect(JSON.stringify(lesson.body)).not.toContain(field)
    // Visitante só vê os níveis publicados (o Nível 1); o admin vê os 7 na ordem.
    const publicTrack = bodyOf<TrackWithCourses>(await agent(ctx.app).get("/api/tracks/python-do-zero-a-ia"))
    expect(publicTrack.courses.map((course) => course.slug)).toEqual(["n1-fundamentos"])
    const adminTrack = bodyOf<TrackWithCourses>(await admin.agent.get("/api/tracks/python-do-zero-a-ia"))
    expect(adminTrack.courses.map((course) => course.position)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
})
