import type { DraftStepSubmitInput, DraftStepVerifyInput, DraftStepVerifyResult, StepSubmitResult } from "@levelusp/contracts"
import { api } from "./client"

/**
 * "Testar gabarito" de UM passo de exercício do rascunho (ainda não salvo): a API roda a solução de
 * referência (precisa aprovar), o código inicial e cada solução errada (precisam reprovar). Nada é
 * gravado. Chame um passo por vez: o corretor é compartilhado com os alunos. 400 quando o passo
 * está incompleto; 429 com testes demais em pouco tempo; 503 quando o corretor está fora do ar.
 */
export const verifyDraftStep = (input: DraftStepVerifyInput): Promise<DraftStepVerifyResult> =>
  api.post<DraftStepVerifyResult, DraftStepVerifyInput>("/teacher/draft-steps/verify", input)

/**
 * "Verificar" da prévia do professor: corrige a submissão (`files`, ou `arrangement` no exercício
 * de ordenar) contra os casos do passo do rascunho. A resposta tem o formato da do aluno, sem
 * efeito em progresso, XP ou tentativas. 400, 429 e 503 como em {@link verifyDraftStep}.
 */
export const submitDraftStep = (input: DraftStepSubmitInput): Promise<StepSubmitResult> =>
  api.post<StepSubmitResult, DraftStepSubmitInput>("/teacher/draft-steps/submit", input)
