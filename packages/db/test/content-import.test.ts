import { asc, eq, TransactionRollbackError } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { ContentBundle } from "@levelusp/contracts"
import {
  ContentBundleError, courses, createDb, examQuestions, exams, importContentBundle, lessonQuizQuestions, lessonSteps, lessons, modules,
  trackCourses, tracks, type DbHandle, type DbTransaction,
} from "../src/index"
import { loadFixtureBundle } from "./support/bundles"

/** Banco já migrado (o mesmo dos e2e da API). Esta suíte só roda em `pnpm test:db`; sem a URL ela é pulada. */
const databaseUrl = process.env.TEST_DATABASE_URL

/** Clona o pacote para alterá-lo sem tocar na fixture carregada. */
function cloneBundle(bundle: ContentBundle): ContentBundle {
  return structuredClone(bundle)
}

describe.skipIf(!databaseUrl)("importContentBundle (PostgreSQL real)", () => {
  let handle: DbHandle

  beforeAll(() => {
    if (!databaseUrl) throw new Error("TEST_DATABASE_URL ausente")
    handle = createDb(databaseUrl, { max: 1, applicationName: "levelusp-db-test" })
  })

  afterAll(async () => {
    await handle.close()
  })

  /** Roda o corpo numa transação SEMPRE desfeita, para o banco de teste continuar limpo. */
  async function inRolledBackTransaction(body: (tx: DbTransaction) => Promise<void>): Promise<void> {
    try {
      await handle.db.transaction(async (tx: DbTransaction) => {
        await body(tx)
        tx.rollback()
      })
    } catch (error) {
      if (!(error instanceof TransactionRollbackError)) throw error
    }
  }

  it("grava trilha, cursos, prova, módulos, lições, quiz e passos do pacote", async () => {
    await inRolledBackTransaction(async (tx) => {
      const summary = await importContentBundle(tx, loadFixtureBundle(), { authorId: null })
      expect(summary).toEqual({ tracks: 1, courses: 2, modules: 2, lessons: 5, steps: 4 })

      const [n1] = await tx.select().from(courses).where(eq(courses.slug, "n1-fundamentos"))
      const [n2] = await tx.select().from(courses).where(eq(courses.slug, "n2-intermediario"))
      if (!n1 || !n2) throw new Error("cursos não gravados")
      expect(n1).toMatchObject({ sequential: true, published: true, prerequisiteCourseId: null, estimatedHours: 50 })
      expect(n2.prerequisiteCourseId).toBe(n1.id)

      const [exam] = await tx.select().from(exams).where(eq(exams.courseId, n1.id))
      if (!exam) throw new Error("prova não gravada")
      const questions = await tx.select().from(examQuestions).where(eq(examQuestions.examId, exam.id)).orderBy(asc(examQuestions.sortOrder))
      expect(questions.map((question) => question.correctIndex)).toEqual([1, 1])

      const courseModules = await tx.select().from(modules).where(eq(modules.courseId, n1.id))
      expect(courseModules.map((module) => module.slug)).toEqual(["m1-primeiros-passos"])

      const courseLessons = await tx.select().from(lessons).where(eq(lessons.courseId, n1.id)).orderBy(asc(lessons.order))
      expect(courseLessons.map((lesson) => [lesson.slug, lesson.order, lesson.lessonType])).toEqual([
        ["n1-m1-01-ola-python", 1, "guided"], ["n1-m1-02-variaveis", 2, "coding"], ["n1-m1-03-fixacao", 3, "quiz"], ["n1-m1-04-como-funciona", 4, "theory"],
      ])
      const [guided, coding, quiz] = courseLessons
      if (!guided || !coding || !quiz) throw new Error("lições não gravadas")
      expect(guided).toMatchObject({ moduleId: courseModules[0]?.id, module: "Primeiros passos", testCases: [], objectives: ["Executar um programa Python e ler a saída", "Explicar o que `print` faz"] })
      const steps = await tx.select().from(lessonSteps).where(eq(lessonSteps.lessonId, guided.id)).orderBy(asc(lessonSteps.order))
      expect(steps.map((step) => [step.order, step.kind, step.xp])).toEqual([[1, "leitura", 10], [2, "exercicio", 20], [3, "quiz", 10]])
      expect(steps[1]?.hints).toHaveLength(2)
      expect(await tx.select().from(lessonSteps).where(eq(lessonSteps.lessonId, coding.id))).toEqual([])
      expect(coding.testCases).toHaveLength(1)
      expect(coding.solutionFiles[0]?.content).toBe('linguagem = "Python"\n')
      const quizQuestions = await tx.select().from(lessonQuizQuestions).where(eq(lessonQuizQuestions.lessonId, quiz.id)).orderBy(asc(lessonQuizQuestions.sortOrder))
      expect(quizQuestions.map((question) => question.prompt)).toEqual(["2 + 2?", "Tipo de 1.5?"])

      const [track] = await tx.select().from(tracks).where(eq(tracks.slug, "python-ia"))
      if (!track) throw new Error("trilha não gravada")
      const links = await tx.select().from(trackCourses).where(eq(trackCourses.trackId, track.id)).orderBy(asc(trackCourses.position))
      expect(links.map((link) => link.courseId)).toEqual([n1.id, n2.id])
    })
  })

  it("é idempotente e preserva ids ao atualizar (passos a mais são apagados, questões da prova viram inativas)", async () => {
    await inRolledBackTransaction(async (tx) => {
      const first = loadFixtureBundle()
      await importContentBundle(tx, first, { authorId: null })
      const [guidedBefore] = await tx.select().from(lessons).where(eq(lessons.slug, "n1-m1-01-ola-python"))
      if (!guidedBefore) throw new Error("lição não gravada")
      const stepsBefore = await tx.select().from(lessonSteps).where(eq(lessonSteps.lessonId, guidedBefore.id)).orderBy(asc(lessonSteps.order))

      const second = cloneBundle(first)
      const n1 = second.courses[0]
      const guided = n1?.modules[0]?.lessons[0]
      if (!n1?.exam || !guided) throw new Error("fixture inesperada")
      guided.title = "Olá, Python (revisada)"
      guided.steps = guided.steps.slice(0, 2)
      n1.exam.questions = n1.exam.questions.slice(0, 1)
      const summary = await importContentBundle(tx, second, { authorId: null })
      expect(summary.steps).toBe(3)

      const [guidedAfter] = await tx.select().from(lessons).where(eq(lessons.slug, "n1-m1-01-ola-python"))
      expect(guidedAfter?.id).toBe(guidedBefore.id)
      expect(guidedAfter?.title).toBe("Olá, Python (revisada)")
      const stepsAfter = await tx.select().from(lessonSteps).where(eq(lessonSteps.lessonId, guidedBefore.id)).orderBy(asc(lessonSteps.order))
      expect(stepsAfter.map((step) => step.id)).toEqual(stepsBefore.slice(0, 2).map((step) => step.id))

      const [course] = await tx.select().from(courses).where(eq(courses.slug, "n1-fundamentos"))
      const [exam] = await tx.select().from(exams).where(eq(exams.courseId, course?.id ?? ""))
      const questions = await tx.select().from(examQuestions).where(eq(examQuestions.examId, exam?.id ?? "")).orderBy(asc(examQuestions.sortOrder))
      expect(questions.map((question) => question.active)).toEqual([true, false])
      expect((await tx.select().from(lessons).where(eq(lessons.courseId, course?.id ?? ""))).length).toBe(4)
    })
  })

  it("recusa trilha que aponta para curso inexistente", async () => {
    await inRolledBackTransaction(async (tx) => {
      const bundle = cloneBundle(loadFixtureBundle())
      bundle.tracks[0]?.courses.push("n9-inexistente")
      await expect(importContentBundle(tx, bundle, { authorId: null })).rejects.toBeInstanceOf(ContentBundleError)
    })
  })
})
