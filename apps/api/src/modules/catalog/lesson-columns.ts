import { getTableColumns } from "drizzle-orm"
import { lessons, type LessonRow } from "@levelusp/db"

/**
 * Colunas de `lessons` SEM `test_cases`. Toda consulta que alimenta uma
 * resposta para o aluno usa isto: o gabarito nem sai do banco.
 */
const { testCases: _answerKey, ...publicColumns } = getTableColumns(lessons)
export const publicLessonColumns = publicColumns

/** Linha de lição SEM o gabarito — o que as consultas do aluno selecionam. */
export type PublicLessonRow = Omit<LessonRow, "testCases">

export const lessonSummaryColumns = {
  id: lessons.id,
  title: lessons.title,
  slug: lessons.slug,
  module: lessons.module,
  moduleId: lessons.moduleId,
  order: lessons.order,
  difficulty: lessons.difficulty,
  lessonType: lessons.lessonType,
  xpReward: lessons.xpReward,
  courseId: lessons.courseId,
  published: lessons.published,
}

/** Lição resumida, como {@link lessonSummaryColumns} seleciona. */
export type LessonSummaryRow = Pick<PublicLessonRow, keyof typeof lessonSummaryColumns>
