import type { AnswerSheet, AnswerSheetResult } from "@levelusp/contracts"
import { reviewAnswers, type GradableQuestion } from "@/common/scoring/answer-sheet"

export type QuizGrade = Omit<AnswerSheetResult, "passingScore">

/**
 * Corrige um quiz. Nota = acertos/total × 100, arredondada para inteiro;
 * aprovado se nota ≥ nota mínima. Questão sem resposta conta como erro;
 * respostas para ids que não são da lição são ignoradas.
 */
export function gradeQuiz(questions: readonly GradableQuestion[], answers: Readonly<AnswerSheet>, passingScore: number): QuizGrade {
  const { review, correctCount } = reviewAnswers(questions, answers)
  const total = questions.length
  const score = total ? Math.round((correctCount / total) * 100) : 0
  return { score, passed: total > 0 && score >= passingScore, correctCount, total, review }
}
