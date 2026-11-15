import { getTableColumns } from "drizzle-orm"
import { lessons, type LessonRow } from "@levelusp/db"

/**
 * Colunas de `lessons` SEM `test_cases` e SEM `solution_files`. Toda consulta que
 * alimenta uma resposta para o aluno usa isto: o gabarito nem sai do banco.
 */
const { testCases: _answerKey, solutionFiles: _referenceSolution, ...publicColumns } = getTableColumns(lessons)
export const publicLessonColumns = publicColumns

/** Linha de lição SEM o gabarito — o que as consultas do aluno selecionam. */
export type PublicLessonRow = Omit<LessonRow, "testCases" | "solutionFiles">

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
  isProject: lessons.isProject,
}

/** Lição resumida, como {@link lessonSummaryColumns} seleciona. */
export type LessonSummaryRow = Pick<PublicLessonRow, keyof typeof lessonSummaryColumns>
