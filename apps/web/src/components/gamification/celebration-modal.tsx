"use client"

import type { ReactNode, Ref } from "react"
import { AnimatePresence, motion, type MotionProps, type MotionStyle } from "framer-motion"
import { useModalA11y } from "@/hooks/use-modal-a11y"
import { cn, definedProps } from "@/lib/utils"

export type ModalMotion = Pick<MotionProps, "initial" | "animate" | "exit" | "transition">

interface CelebrationModalProps {
  isOpen: boolean
  onClose: () => void
  /** Camada e escurecimento do fundo, ex.: `"z-[10000] bg-black/70"`. */
  backdropClassName: string
  backdropTransition?: MotionProps["transition"] | undefined
  className: string
  style?: MotionStyle | undefined
  motion: ModalMotion
  /** Recebe o elemento do diálogo além do foco preso (ex.: origem das partículas de XP). */
  ref?: Ref<HTMLDivElement>
  "aria-label"?: string | undefined
  "aria-labelledby"?: string | undefined
  "aria-describedby"?: string | undefined
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
export function CelebrationModal({
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
}: CelebrationModalProps): React.JSX.Element {
  const dialogRef = useModalA11y<HTMLDivElement>(isOpen, onClose)

  const attachDialog = (element: HTMLDivElement | null): void => {
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
          {...definedProps({ transition: backdropTransition })}
          className={cn("fixed inset-0 flex items-center justify-center", backdropClassName)}
          onClick={onClose}
        >
          <motion.div
            {...definedProps(dialogMotion)}
            ref={attachDialog}
            role="dialog"
            aria-modal="true"
            {...definedProps(ariaProps)}
            onClick={(event) => event.stopPropagation()}
            className={className}
            {...definedProps({ style })}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
