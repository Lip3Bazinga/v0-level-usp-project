import { z } from "zod"

/** Maior índice de alternativa aceito numa resposta (questões têm até 8 opções). */
const MAX_ANSWER_INDEX = 20

/** Campos comuns às questões de múltipla escolha (quiz de lição e prova final). */
export const multipleChoiceFields = {
  prompt: z.string().trim().min(1).max(2000),
  options: z.array(z.string().trim().min(1).max(500)).min(2).max(8),
  correct_index: z.number().int().min(0),
  explanation: z.string().trim().max(2000).default(""),
}

interface WithCorrectIndex {
  options: string[]
  correct_index: number
}

/** O gabarito precisa apontar para uma das alternativas. */
export function correctIndexWithinOptions<T extends WithCorrectIndex>(question: T): boolean {
  return question.correct_index < question.options.length
}
export const CORRECT_INDEX_OUT_OF_RANGE = { message: "correct_index fora das opções", path: ["correct_index"] }

/** Respostas do aluno: id da questão → índice da alternativa escolhida. */
export const answerSheetSchema = z.record(z.uuid(), z.number().int().min(0).max(MAX_ANSWER_INDEX))
/** Respostas do aluno já validadas por {@link answerSheetSchema}. */
export type AnswerSheet = z.infer<typeof answerSheetSchema>

/** Correção de uma questão, com a explicação do professor. */
export interface AnswerReview {
  questionId: string
  correct: boolean
  explanation: string
}

/** Resultado de uma folha de respostas corrigida no servidor. */
export interface AnswerSheetResult {
  score: number
  passed: boolean
  passingScore: number
  correctCount: number
  total: number
  review: AnswerReview[]
}
