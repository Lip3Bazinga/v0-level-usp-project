/**
 * Tipo do "kind" de toast usado pelas telas de admin. Antes cada componente
 * redeclarava a união inline (algumas como `string`, outras sem "warning"),
 * gerando inconsistência. Fonte única.
 */
export type ToastKind = "success" | "danger" | "info" | "warning"

/** Assinatura do callback onToast passado do painel admin para as sub-telas. */
export type OnToast = (msg: string, kind?: ToastKind) => void
