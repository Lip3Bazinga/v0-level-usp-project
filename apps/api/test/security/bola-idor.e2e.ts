import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { eq } from "drizzle-orm"
import { enrollments, examAttempts, lessons, notes, notifications } from "@levelusp/db"
import type { Course, ExamStart, LessonSnapshot, LibraryRequest, Note, TeacherApproval, UploadedImage, UserDataExport } from "@levelusp/contracts"
import { bodyOf, createLesson, createTestApp, CSRF_HEADER_NAME, required, type TestContext } from "../e2e/harness"
import { completeLessons } from "../e2e/exam-fixtures"
import { courseTitle, createCast, SECRET_EXPECTED, seedOwnedResources, type Cast, type OwnedResources } from "./support"

/*
 * BOLA/IDOR (OWASP API1:2023): com o id de um recurso do usuário A, o usuário B
 * tenta ler, alterar ou apagar. Recurso de outra pessoa deve se comportar como
 * inexistente (404) ou proibido (403), e o banco precisa continuar intacto.
 */

/** PNG 1×1 válido. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64")

describe("BOLA/IDOR: B nunca alcança os recursos de A", () => {
  let ctx: TestContext
  let cast: Cast
  let owned: OwnedResources

  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(async () => {
    await ctx.reset()
    cast = await createCast(ctx)
    owned = await seedOwnedResources(ctx, cast)
  })

  it("notas: B não edita, não apaga nem lista a nota de A", async () => {
    const { studentB } = cast
    expect((await studentB.agent.patch(`/api/me/notes/${owned.noteId}`, { content: "pichado" })).status).toBe(404)
    expect((await studentB.agent.delete(`/api/me/notes/${owned.noteId}`)).status).toBe(404)
    const list = bodyOf<Note[]>(await studentB.agent.get("/api/me/notes"))
    expect(list.map((note) => note.id)).not.toContain(owned.noteId)
    const stored = await ctx.db.query.notes.findFirst({ where: eq(notes.id, owned.noteId) })
    expect(stored?.content).toBe("conteúdo privado de A")
  })

  it("notas: B não vincula nota a rascunho de outro professor (nem descobre o título)", async () => {
    const response = await cast.studentB.agent.post("/api/me/notes", { content: "x", lesson_id: owned.draftLessonId })
    expect(response.status).toBe(404)
    expect(JSON.stringify(response.body)).not.toContain("Rascunho")
    expect((await cast.studentB.agent.post("/api/me/notes", { content: "x", course_id: owned.draftCourse.id })).status).toBe(404)
  })

  it("notificações: B não marca como lida a notificação de A", async () => {
    expect((await cast.studentB.agent.post(`/api/me/notifications/${owned.notificationId}/read`)).status).toBe(404)
    await cast.studentB.agent.post("/api/me/notifications/read-all")
    const stored = await ctx.db.query.notifications.findFirst({ where: eq(notifications.id, owned.notificationId) })
    expect(stored?.read).toBe(false)
  })

  it("rascunho de código (snapshot): cada aluno só lê o próprio", async () => {
    const files = [{ path: "main.py", content: "segredo_de_A = 42" }]
    expect((await cast.studentA.agent.put(`/api/lessons/${owned.publishedLessonId}/snapshot`, { files })).status).toBe(204)
    const snapshot = bodyOf<LessonSnapshot>(await cast.studentB.agent.get(`/api/lessons/${owned.publishedLessonId}/snapshot`))
    expect(snapshot.files).toBeNull()
    // Rascunho de lição não publicada de outro professor: 404, não o conteúdo.
    expect((await cast.studentB.agent.get(`/api/lessons/${owned.draftLessonId}/snapshot`)).status).toBe(404)
    expect((await cast.studentB.agent.put(`/api/lessons/${owned.draftLessonId}/snapshot`, { files })).status).toBe(404)
  })

  it("matrícula: o corpo não escolhe o aluno (user_id ignorado)", async () => {
    const response = await cast.studentB.agent.post(`/api/courses/${owned.publishedCourse.id}/enrollment`, { user_id: cast.studentA.id })
    expect(response.status).toBe(204)
    const rows = await ctx.db.select().from(enrollments).where(eq(enrollments.courseId, owned.publishedCourse.id))
    expect(rows.map((row) => row.userId)).toEqual([cast.studentB.id])
    expect((await cast.studentB.agent.post(`/api/courses/${owned.draftCourse.id}/enrollment`)).status).toBe(404)
  })

  it("prova: B não envia nem lê a tentativa de A pelo id", async () => {
    await completeLessons(ctx, cast.studentA.id, [owned.publishedLessonId, owned.quizLessonId])
    const start = await cast.studentA.agent.post(`/api/courses/${owned.publishedCourse.id}/exam/attempts`)
    expect(start.status).toBe(200)
    const attempt = bodyOf<ExamStart>(start)
    const hijack = await cast.studentB.agent.post(`/api/courses/${owned.publishedCourse.id}/exam/submit`, { attemptId: attempt.attemptId, answers: {} })
    expect(hijack.status).toBe(404)
    const stored = await ctx.db.query.examAttempts.findFirst({ where: eq(examAttempts.id, attempt.attemptId) })
    expect(stored?.submittedAt).toBeNull()
    // B não é elegível só porque A é.
    expect((await cast.studentB.agent.post(`/api/courses/${owned.publishedCourse.id}/exam/attempts`)).status).toBe(403)
  })

  it("certificado: B não emite nem lê o certificado do curso que A concluiu", async () => {
    await completeLessons(ctx, cast.studentA.id, [owned.publishedLessonId, owned.quizLessonId])
    expect((await cast.studentB.agent.post(`/api/courses/${owned.publishedCourse.id}/certificate`)).status).toBe(403)
    expect((await cast.studentB.agent.get(`/api/courses/${owned.publishedCourse.id}/certificate`)).body).toBeNull()
  })

  it("solicitações (professor e biblioteca): cada um vê só as próprias", async () => {
    expect((await cast.studentB.agent.get("/api/me/teacher-request")).body).toBeNull()
    const requests = bodyOf<LibraryRequest[]>(await cast.teacherB.agent.get("/api/me/library/requests"))
    expect(requests).toEqual([])
    const own = bodyOf<TeacherApproval | null>(await cast.studentA.agent.get("/api/me/teacher-request"))
    expect(own?.id).toBe(owned.teacherApprovalId)
  })

  it("exportação LGPD: só os dados de quem pediu", async () => {
    const exported = bodyOf<UserDataExport>(await cast.studentB.agent.get("/api/me/export"))
    expect(exported.profile.id).toBe(cast.studentB.id)
    expect(JSON.stringify(exported)).not.toContain(owned.noteId)
    expect(JSON.stringify(exported)).not.toContain(cast.studentA.email)
  })

  it("curso: professor B não edita, publica, apaga nem reordena o curso de A", async () => {
    const { teacherB } = cast
    const courseId = owned.publishedCourse.id
    expect((await teacherB.agent.patch(`/api/courses/${courseId}`, { title: "Sequestrado" })).status).toBe(403)
    expect((await teacherB.agent.patch(`/api/courses/${courseId}/publish`, { published: false })).status).toBe(403)
    expect((await teacherB.agent.put(`/api/courses/${courseId}/lessons/order`, { lesson_ids: [owned.publishedLessonId] })).status).toBe(403)
    expect((await teacherB.agent.delete(`/api/courses/${courseId}/lessons/${owned.publishedLessonId}`)).status).toBe(403)
    expect((await teacherB.agent.delete(`/api/courses/${courseId}`)).status).toBe(403)
    // Rascunho de A: 404 (nem revela que existe).
    expect((await teacherB.agent.patch(`/api/courses/${owned.draftCourse.id}`, { title: "Título invadido" })).status).toBe(404)
    expect((await teacherB.agent.get(`/api/courses/${owned.draftCourse.id}`)).status).toBe(404)
    expect((await teacherB.agent.get(`/api/courses/${owned.draftCourse.id}/lessons`)).status).toBe(404)
    expect(await courseTitle(ctx, courseId)).toBe("Curso de A")
  })

  it("curso: B não injeta a própria lição no curso de A nem rouba a lição de A", async () => {
    const lessonOfB = await createLesson(ctx.db, { title: "De B", published: true, createdBy: cast.teacherB.id })
    expect((await cast.teacherB.agent.post(`/api/courses/${owned.publishedCourse.id}/lessons`, { lesson_id: lessonOfB.id })).status).toBe(403)
    expect((await cast.teacherB.agent.patch(`/api/lessons/${lessonOfB.id}`, { course_id: owned.publishedCourse.id })).status).toBe(403)
    const courseOfB = bodyOf<Course>(await cast.teacherB.agent.post("/api/courses", { title: "Curso de B" }))
    expect((await cast.teacherB.agent.post(`/api/courses/${courseOfB.id}/lessons`, { lesson_id: owned.publishedLessonId })).status).toBe(403)
    const stolen = await ctx.db.query.lessons.findFirst({ where: eq(lessons.id, owned.publishedLessonId) })
    expect(stolen?.courseId).toBe(owned.publishedCourse.id)
  })

  it("lição: B não lê o gabarito, não edita nem apaga a lição de A", async () => {
    const { teacherB, studentB } = cast
    for (const client of [teacherB, studentB]) {
      const authoring = await client.agent.get(`/api/lessons/${owned.publishedLessonId}/authoring`)
      expect(authoring.status).toBe(403)
      expect(JSON.stringify(authoring.body)).not.toContain(SECRET_EXPECTED)
    }
    expect((await teacherB.agent.patch(`/api/lessons/${owned.publishedLessonId}`, { title: "Título invadido" })).status).toBe(403)
    expect((await teacherB.agent.patch(`/api/lessons/${owned.publishedLessonId}/publish`, { published: false })).status).toBe(403)
    expect((await teacherB.agent.delete(`/api/lessons/${owned.publishedLessonId}`)).status).toBe(403)
    expect((await teacherB.agent.get(`/api/lessons/${owned.quizLessonId}/quiz/authoring`)).status).toBe(403)
    expect((await teacherB.agent.put(`/api/lessons/${owned.quizLessonId}/quiz`, { questions: [] })).status).toBe(403)
    // Rascunho: 404 para leitura pública, autoria e quiz.
    for (const path of ["", "/authoring", "/quiz", "/snapshot"]) {
      expect((await teacherB.agent.get(`/api/lessons/${owned.draftLessonId}${path}`)).status).toBe(404)
    }
  })

  it("uploads: B não usa nem apaga a imagem enviada por A", async () => {
    const uploaded = await cast.teacherA.agent.raw.post("/api/uploads/images").set(CSRF_HEADER_NAME, "1").attach("file", PNG, "a.png")
    const { url } = bodyOf<UploadedImage>(uploaded)
    expect((await cast.studentB.agent.patch("/api/me/profile", { avatar_url: url })).status).toBe(403)
    const courseOfB = bodyOf<Course>(await cast.teacherB.agent.post("/api/courses", { title: "Curso de B" }))
    expect((await cast.teacherB.agent.patch(`/api/courses/${courseOfB.id}`, { cover_image_url: url })).status).toBe(403)
    expect((await cast.teacherB.agent.post("/api/courses", { title: "Outro", cover_image_url: url })).status).toBe(403)
    expect((await cast.studentB.agent.get(url)).status).toBe(200)
  })

  it("admin age sobre recurso alheio com auditoria (o único papel que pode)", async () => {
    const response = await cast.admin.agent.patch(`/api/courses/${owned.publishedCourse.id}`, { title: "Ajustado pela coordenação" })
    expect(response.status).toBe(200)
    expect(required(await courseTitle(ctx, owned.publishedCourse.id), "curso")).toBe("Ajustado pela coordenação")
  })
})
