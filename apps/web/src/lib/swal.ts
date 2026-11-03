import Swal, { type SweetAlertIcon, type SweetAlertOptions } from "sweetalert2"
import { TOAST_DURATION_MS } from "@/lib/constants"
import type { ToastKind } from "@/lib/types"

/*
 * Feedback ao usuário (toasts, alertas e confirmações) com o visual da marca.
 * O `!` das classes força o Tailwind por cima do CSS padrão do SweetAlert2.
 */

const BUTTON_BASE = "!rounded-xl !px-6 !py-2.5 !text-sm !font-semibold !transition-colors !shadow-none"
const PRIMARY_BUTTON = `${BUTTON_BASE} !bg-level-purple !text-white hover:!bg-level-purple-dark`
const DANGER_BUTTON = `${BUTTON_BASE} !bg-destructive !text-white hover:!bg-destructive/90`
const SECONDARY_BUTTON = `${BUTTON_BASE} !border-2 !border-border !bg-white !text-foreground hover:!bg-muted`

const CUSTOM_CLASS = {
  popup: "!rounded-2xl !shadow-2xl !font-sans",
  title: "!text-level-purple-dark !font-bold",
  confirmButton: PRIMARY_BUTTON,
  cancelButton: SECONDARY_BUTTON,
  denyButton: DANGER_BUTTON,
}

const BASE_OPTIONS = {
  customClass: CUSTOM_CLASS,
  buttonsStyling: false,
  showClass: { popup: "animate__animated animate__fadeInUp animate__faster" },
  hideClass: { popup: "animate__animated animate__fadeOutDown animate__faster" },
} satisfies SweetAlertOptions

/** Textos e aparência do diálogo de {@link swalConfirm}. */
export interface ConfirmOptions {
  title: string
  text?: string
  confirmText?: string
  cancelText?: string
  icon?: Extract<SweetAlertIcon, "warning" | "question" | "info">
  /** Pinta o botão de confirmar de vermelho (ações destrutivas). */
  danger?: boolean
}

/** Diálogo de confirmação; resolve `true` se o usuário confirmou. */
export async function swalConfirm({
  title,
  text,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  icon = "warning",
  danger = false,
}: ConfirmOptions): Promise<boolean> {
  const result = await Swal.fire({
    ...BASE_OPTIONS,
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    customClass: { ...CUSTOM_CLASS, confirmButton: danger ? DANGER_BUTTON : PRIMARY_BUTTON },
    reverseButtons: true,
  })
  return result.isConfirmed
}

interface AlertOptions {
  title: string
  text?: string
}

/** Alerta de erro com um botão de fechar; resolve quando o usuário o fecha. */
export async function swalError({ title = "Erro", text = "Algo deu errado. Tente novamente." }: Partial<AlertOptions>): Promise<void> {
  await Swal.fire({ ...BASE_OPTIONS, icon: "error", title, text, confirmButtonText: "Fechar" })
}

/** Alerta de aviso com um botão de ciência; resolve quando o usuário o fecha. */
export async function swalWarning({ title, text }: AlertOptions): Promise<void> {
  await Swal.fire({ ...BASE_OPTIONS, icon: "warning", title, text, confirmButtonText: "Entendido" })
}

/**
 * Toast discreto no canto superior direito, que some sozinho. Não bloqueia nem
 * devolve promessa: quem chama segue o fluxo sem esperar o toast fechar.
 */
export function swalToast({ title, icon = "success" }: { title: string; icon?: ToastKind }): void {
  void Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: TOAST_DURATION_MS,
    timerProgressBar: true,
    customClass: { popup: "!rounded-xl !text-sm !font-medium" },
  }).fire({ icon, title })
}
