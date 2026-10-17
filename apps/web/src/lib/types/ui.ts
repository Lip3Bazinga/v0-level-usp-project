/** Variante visual dos toasts das telas de administração. */
export type ToastKind = "success" | "danger" | "info" | "warning"

/** Callback que o painel de administração repassa às subtelas para exibir toasts. */
export type OnToast = (message: string, kind?: ToastKind) => void
