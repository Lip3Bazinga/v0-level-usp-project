import type { Difficulty, Lesson, LessonInput, LessonWithTests } from "@levelusp/contracts"

const MAX_TITLE_LENGTH = 160

export type PublicationFilter = "all" | "published" | "draft"

export interface LessonListQuery {
  search: string
  publication: PublicationFilter
  /** `null` = todas as dificuldades. */
  difficulty: Difficulty | null
  /** `null` = todos os módulos. */
  moduleTitle: string | null
}

const PUBLICATION_MATCHERS: Record<PublicationFilter, (lesson: Lesson) => boolean> = {
  all: () => true,
  published: (lesson) => lesson.published,
  draft: (lesson) => !lesson.published,
}

/** Lições que casam com os filtros do painel, na ordem da trilha. */
export function filterLessons(lessons: Lesson[], { search, publication, difficulty, moduleTitle }: LessonListQuery): Lesson[] {
  const term = search.toLowerCase()
  return lessons
    .filter(
      (lesson) =>
        (!term || lesson.title.toLowerCase().includes(term)) &&
        PUBLICATION_MATCHERS[publication](lesson) &&
        (difficulty === null || lesson.difficulty === difficulty) &&
        (moduleTitle === null || lesson.module === moduleTitle),
    )
    .sort((first, second) => first.order - second.order)
}

/** Cópia completa (com gabarito) como lição avulsa; o questionário fica em tabela própria e não é copiado. */
export function duplicateLessonInput(source: LessonWithTests): LessonInput {
  return {
    title: `${source.title} (cópia)`.slice(0, MAX_TITLE_LENGTH),
    description: source.description,
    module: source.module,
    module_id: source.module_id,
    course_id: null,
    order: source.order,
    difficulty: source.difficulty,
    content_markdown: source.content_markdown,
    starter_code: source.starter_code,
    starter_files: source.starter_files,
    checkpoints: source.checkpoints,
    libraries: source.libraries ?? [],
    lesson_type: source.lesson_type,
    quiz_passing_score: source.quiz_passing_score,
    xp_reward: source.xp_reward,
    time_limit: source.time_limit,
    test_cases: source.test_cases,
  }
}
