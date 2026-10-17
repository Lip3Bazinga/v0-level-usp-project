/** Vocabulário único dos avisos: o mesmo do `swalToast` e do toast do painel do admin. */
export type ToastKind = "success" | "error" | "info" | "warning"

/** Callback que o painel de administração repassa às subtelas para exibir toasts. */
export type OnToast = (message: string, kind?: ToastKind) => void
