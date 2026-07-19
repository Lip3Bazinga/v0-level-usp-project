import Swal from "sweetalert2"

const BASE = {
  customClass: {
    popup: "!rounded-2xl !shadow-2xl !font-sans",
    title: "!text-level-purple-dark !font-bold",
    confirmButton:
      "!rounded-xl !bg-level-purple !px-6 !py-2.5 !text-sm !font-semibold !text-white hover:!bg-level-purple-dark !transition-colors !shadow-none",
    cancelButton:
      "!rounded-xl !border-2 !border-border !bg-white !px-6 !py-2.5 !text-sm !font-semibold !text-foreground hover:!bg-muted !transition-colors !shadow-none",
    denyButton:
      "!rounded-xl !bg-destructive !px-6 !py-2.5 !text-sm !font-semibold !text-white hover:!bg-destructive/90 !transition-colors !shadow-none",
  },
  buttonsStyling: false,
  showClass: {
    popup: "animate__animated animate__fadeInUp animate__faster",
  },
  hideClass: {
    popup: "animate__animated animate__fadeOutDown animate__faster",
  },
}

// ── Confirmação ───────────────────────────────────────────────────────────────

export async function swalConfirm(options: {
  title: string
  text?: string
  confirmText?: string
  cancelText?: string
  icon?: "warning" | "question" | "info"
  danger?: boolean
}): Promise<boolean> {
  const result = await Swal.fire({
    ...BASE,
    icon: options.icon ?? "warning",
    title: options.title,
    text: options.text,
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? "Confirmar",
    cancelButtonText: options.cancelText ?? "Cancelar",
    customClass: {
      ...BASE.customClass,
      confirmButton: options.danger
        ? "!rounded-xl !bg-destructive !px-6 !py-2.5 !text-sm !font-semibold !text-white hover:!bg-destructive/90 !transition-colors !shadow-none"
        : BASE.customClass.confirmButton,
    },
    reverseButtons: true,
  })
  return result.isConfirmed
}

// ── Sucesso ───────────────────────────────────────────────────────────────────

export function swalSuccess(options: { title: string; text?: string; timer?: number }) {
  return Swal.fire({
    ...BASE,
    icon: "success",
    title: options.title,
    text: options.text,
    timer: options.timer ?? 2500,
    timerProgressBar: true,
    showConfirmButton: false,
  })
}

// ── Erro ──────────────────────────────────────────────────────────────────────

export function swalError(options: { title?: string; text?: string }) {
  return Swal.fire({
    ...BASE,
    icon: "error",
    title: options.title ?? "Erro",
    text: options.text ?? "Algo deu errado. Tente novamente.",
    confirmButtonText: "Fechar",
  })
}

// ── Aviso ─────────────────────────────────────────────────────────────────────

export function swalWarning(options: { title: string; text?: string }) {
  return Swal.fire({
    ...BASE,
    icon: "warning",
    title: options.title,
    text: options.text,
    confirmButtonText: "Entendido",
  })
}

// ── Info ──────────────────────────────────────────────────────────────────────

export function swalInfo(options: { title: string; text?: string; timer?: number }) {
  return Swal.fire({
    ...BASE,
    icon: "info",
    title: options.title,
    text: options.text,
    timer: options.timer,
    timerProgressBar: !!options.timer,
    showConfirmButton: !options.timer,
    confirmButtonText: "OK",
  })
}

// ── Toast (canto superior direito) ───────────────────────────────────────────

export function swalToast(options: { title: string; icon?: "success" | "error" | "warning" | "info" }) {
  return Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: "!rounded-xl !text-sm !font-medium",
    },
  }).fire({
    icon: options.icon ?? "success",
    title: options.title,
  })
}
