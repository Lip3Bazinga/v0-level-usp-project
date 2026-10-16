/** Questão com gabarito, como a correção precisa. */
export interface GradableQuestion {
  id: string
  correctIndex: number
  explanation: string
}

export interface QuizGrade {
  score: number
  passed: boolean
  correctCount: number
  total: number
  review: { questionId: string; correct: boolean; explanation: string }[]
}

/**
 * Corrige um quiz. Nota = acertos/total × 100, arredondada para inteiro;
 * aprovado se nota ≥ nota mínima. Questão sem resposta conta como erro;
 * respostas para ids que não são da lição são ignoradas.
 */
export function gradeQuiz(questions: readonly GradableQuestion[], answers: Readonly<Record<string, number>>, passingScore: number): QuizGrade {
  const review = questions.map((q) => {
    const given = Object.hasOwn(answers, q.id) ? answers[q.id] : undefined
    return { questionId: q.id, correct: given === q.correctIndex, explanation: q.explanation }
  })
  const correctCount = review.filter((r) => r.correct).length
  const total = questions.length
  const score = total ? Math.round((correctCount / total) * 100) : 0
  return { score, passed: total > 0 && score >= passingScore, correctCount, total, review }
}
