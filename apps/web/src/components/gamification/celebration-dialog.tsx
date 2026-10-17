"use client"

import type { CSSProperties, ReactNode, Ref } from "react"
import { AnimatePresence, motion, type MotionProps } from "framer-motion"
import { useModalA11y } from "@/hooks/use-modal-a11y"

export type DialogMotion = Pick<MotionProps, "initial" | "animate" | "exit" | "transition">

interface CelebrationDialogProps {
  isOpen: boolean
  onClose: () => void
  /** Camada e escurecimento do fundo, ex.: `"z-[10000] bg-black/70"`. */
  backdropClassName: string
  backdropTransition?: MotionProps["transition"]
  className: string
  style?: CSSProperties
  motion: DialogMotion
  /** Recebe o elemento do diálogo além do foco preso (ex.: origem das partículas de XP). */
  ref?: Ref<HTMLDivElement>
  "aria-label"?: string
  "aria-labelledby"?: string
  "aria-describedby"?: string
  children: ReactNode
}

function assignRef<T>(ref: Ref<T> | undefined, value: T): void {
  if (typeof ref === "function") ref(value)
  else if (ref) ref.current = value
}

/**
 * Diálogo animado das comemorações (nível, badge, sequência, matrícula...): fundo
 * clicável que fecha, foco preso e Esc (useModalA11y) e animação de entrada/saída.
 */
export function CelebrationDialog({
  isOpen,
  onClose,
  backdropClassName,
  backdropTransition,
  className,
  style,
  motion: dialogMotion,
  ref,
  children,
  ...ariaProps
}: CelebrationDialogProps) {
  const dialogRef = useModalA11y<HTMLDivElement>(isOpen, onClose)

  const attachDialog = (element: HTMLDivElement | null) => {
    dialogRef.current = element
    assignRef(ref, element)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={backdropTransition}
          className={`fixed inset-0 flex items-center justify-center ${backdropClassName}`}
          onClick={onClose}
        >
          <motion.div
            {...dialogMotion}
            ref={attachDialog}
            role="dialog"
            aria-modal="true"
            {...ariaProps}
            onClick={(event) => event.stopPropagation()}
            className={className}
            style={style}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
