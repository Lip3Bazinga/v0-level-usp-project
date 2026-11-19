/** Cookie httpOnly emitido pela API. O front só verifica a presença dele. */
export const SESSION_COOKIE_NAME = "lvl_session"

/** Chaves de `localStorage` usadas pela web (preferências de UI, nunca dados sensíveis). */
export const STORAGE_KEYS = {
  adminActivePage: "adminPage",
  /** Prefixo do rascunho de código de um passo de lição guiada (`<prefixo><id do passo>`). */
  stepDraftPrefix: "lvl:passo:",
  /** Prévia da aula escondida no editor do professor (`"true"` ou `"false"`). */
  lessonPreviewHidden: "lvl:previa-aula:escondida",
  /** Largura da coluna do editor, em %, quando a prévia fica ao lado (número entre 30 e 70). */
  lessonPreviewWidth: "lvl:previa-aula:largura",
} as const
