import { assembleParsonsCode, DEFAULT_ENTRY_FILE, type ExerciseMode, type ParsonsLine, type ProjectFile, type StepSubmitInput } from "@levelusp/contracts"
import { BadRequest } from "@/common/errors/app-error"

/** O que a submissão precisa saber do exercício: o modo e, no `ordenar`, as linhas do passo. */
export interface SubmittableExercise {
  exerciseMode: ExerciseMode
  parsonsLines: readonly ParsonsLine[]
}

/**
 * Projeto a corrigir conforme o modo do exercício: `ordenar` aceita só `arrangement` (o código
 * é montado com as linhas do passo, então o aluno não envia texto livre); os demais, só `files`.
 * Vale para o passo gravado (aluno) e para o passo do rascunho (prévia do professor).
 *
 * @throws AppError 400 `WRONG_SUBMISSION_FORMAT` (corpo que não é o do modo do exercício) ou
 *         `INVALID_ARRANGEMENT` (linha inexistente ou repetida).
 */
export function resolveSubmittedFiles(exercise: SubmittableExercise, input: Pick<StepSubmitInput, "files" | "arrangement">): ProjectFile[] {
  if (exercise.exerciseMode !== "ordenar") {
    if (!input.files) throw BadRequest("Este exercício é corrigido pelo código: envie os arquivos do projeto.", "WRONG_SUBMISSION_FORMAT")
    return input.files
  }
  if (!input.arrangement) throw BadRequest("Este exercício é de ordenar: envie as linhas na ordem escolhida.", "WRONG_SUBMISSION_FORMAT")
  const content = assembleParsonsCode(exercise.parsonsLines, input.arrangement)
  if (content === null) throw BadRequest("A ordem enviada cita uma linha que não é deste passo ou repete uma linha.", "INVALID_ARRANGEMENT")
  return [{ path: DEFAULT_ENTRY_FILE, content }]
}
