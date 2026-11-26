import { z } from "zod"
import { wrongSolutionSchema } from "./content-bundle"
import { projectFileSchema, projectFilesSchema } from "./files"
import type { CaseResult } from "./grading"
import { lessonRuntimeSchema } from "./lessons"
import { checkStepContent, lessonStepFields, MAX_LESSON_STEPS, parsonsArrangementSchema } from "./steps"

/**
 * "Testar gabarito" do editor do professor: o passo de exercício vem do rascunho AINDA NÃO SALVO
 * (nada é gravado) e é verificado com a mesma regra de `pnpm content:verify`: a solução de
 * referência APROVA, o código inicial REPROVA e cada solução errada REPROVA. As soluções erradas
 * existem só no pedido (`wrong_solutions` nunca é gravado). Rotas de teacher/admin.
 */

/** Soluções erradas por pedido de teste: cada uma é uma execução a mais no executor compartilhado. */
export const MAX_DRAFT_WRONG_SOLUTIONS = 5

/** Motor e bibliotecas da lição em edição, como em `lessonInputSchema`. */
const draftLessonEngineFields = {
  runtime: lessonRuntimeSchema.default("python"),
  libraries: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
}

function checkIsExercise(step: { kind: string }, ctx: z.RefinementCtx): void {
  if (step.kind !== "exercicio") ctx.addIssue({ code: "custom", path: ["kind"], message: "só passos de exercício têm gabarito para testar" })
}

/** Passo de exercício do rascunho, no formato do pacote de conteúdo (campos do passo + soluções erradas). */
export const draftExerciseStepSchema = z
  .object({ ...lessonStepFields, wrong_solutions: z.array(wrongSolutionSchema).max(MAX_DRAFT_WRONG_SOLUTIONS).default([]) })
  .superRefine(checkStepContent)
  .superRefine(checkIsExercise)
/** Passo de exercício do rascunho já validado. */
export type DraftExerciseStep = z.infer<typeof draftExerciseStepSchema>

export const draftStepVerifySchema = z.object({
  ...draftLessonEngineFields,
  step: draftExerciseStepSchema,
  /**
   * Código inicial herdado: numa lição guiada, o passo sem código inicial próprio começa da solução
   * do exercício anterior (`order` dele e os arquivos). Ignorado quando o passo tem código inicial
   * ou é de ordenar.
   */
  inherited_starter: z
    .object({ order: z.number().int().min(1).max(MAX_LESSON_STEPS), files: z.array(projectFileSchema).min(1).max(30) })
    .nullable()
    .default(null),
})
/** Corpo de `POST /teacher/draft-steps/verify`: motor da lição e UM passo de exercício do rascunho. */
export type DraftStepVerifyInput = z.infer<typeof draftStepVerifySchema>

export const draftStepSubmitSchema = z
  .object({
    ...draftLessonEngineFields,
    step: draftExerciseStepSchema,
    /** O projeto a corrigir (exercícios `codigo` e `lacunas`). */
    files: projectFilesSchema.optional(),
    /** Exercício `ordenar`: as linhas escolhidas, na ordem, com o nível de indentação de cada uma. */
    arrangement: parsonsArrangementSchema.optional(),
  })
  .refine((body) => body.files !== undefined || body.arrangement !== undefined, "Envie files (o projeto) ou arrangement (as linhas ordenadas).")
/**
 * Corpo de `POST /teacher/draft-steps/submit` (o "Verificar" da prévia): o passo do rascunho e a
 * submissão, como em `POST /me/lessons/:id/steps/:stepId/submit`.
 */
export type DraftStepSubmitInput = z.infer<typeof draftStepSubmitSchema>

/** Situação do passo no teste do gabarito: `ok` todos os vereditos são os esperados; `falha` algum não é. */
export type DraftStepVerifyStatus = "ok" | "falha"

/** Veredito de um projeto (referência, código inicial ou solução errada) contra os casos do passo. */
export interface DraftProjectVerdict {
  /** O projeto passou em todos os casos. */
  passed: boolean
  /** O veredito é o esperado: a referência aprova; o código inicial e as soluções erradas reprovam. */
  as_expected: boolean
  /** Casos que falharam, com a mensagem que o aluno veria. */
  failed_cases: CaseResult[]
}

/** Veredito do código inicial; `inherited_from` é o `order` do passo de que ele foi herdado. */
export interface DraftStarterVerdict extends DraftProjectVerdict {
  inherited_from: number | null
  /** Exercício `ordenar`: o que rodou foram as linhas na ordem embaralhada, sem indentação. */
  shuffled_order: boolean
}

/** Veredito de uma solução errada, pelo nome dela. */
export interface DraftWrongSolutionVerdict extends DraftProjectVerdict {
  name: string
}

/** Resposta de `POST /teacher/draft-steps/verify`: os vereditos do passo e o motivo de cada problema. */
export interface DraftStepVerifyResult {
  order: number
  status: DraftStepVerifyStatus
  /** null quando as linhas do exercício de ordenar não montam a solução (nada rodou). */
  solution: DraftProjectVerdict | null
  /** null quando o passo não tem código inicial (nem herdado). */
  starter: DraftStarterVerdict | null
  wrong_solutions: DraftWrongSolutionVerdict[]
  /** Motivos dos problemas, uma frase por item, em pt-BR; vazio quando `status` é `ok`. */
  details: string[]
}
