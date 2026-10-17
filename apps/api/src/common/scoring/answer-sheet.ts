import type { AnswerReview, AnswerSheet } from "@levelusp/contracts"

/** Questão com gabarito, como a correção precisa. */
export interface GradableQuestion {
  id: string
  correctIndex: number
  explanation: string
}

export interface ReviewedAnswers {
  review: AnswerReview[]
  correctCount: number
  /** Só as respostas a questões da folha (o resto é descartado). */
  answeredQuestions: AnswerSheet
}

/**
 * Confere cada questão contra a resposta do aluno. Questão sem resposta conta
 * como erro; respostas a ids que não são da folha são ignoradas — inclusive
 * chaves herdadas do protótipo ("constructor", "toString").
 */
export function reviewAnswers(questions: readonly GradableQuestion[], answers: Readonly<AnswerSheet>): ReviewedAnswers {
  const answeredQuestions: AnswerSheet = {}
  const review = questions.map((question) => {
    const given = Object.hasOwn(answers, question.id) ? answers[question.id] : undefined
    if (typeof given === "number" && Number.isInteger(given)) answeredQuestions[question.id] = given
    return { questionId: question.id, correct: given === question.correctIndex, explanation: question.explanation }
  })
  return { review, correctCount: review.filter((item) => item.correct).length, answeredQuestions }
}
