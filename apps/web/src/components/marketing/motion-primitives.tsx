"use client"

import { motion, useInView, type MotionProps, type Variants } from "framer-motion"
import { useRef, type ReactNode } from "react"
import { definedProps } from "@/lib/utils"

/** Curva de desaceleração única das animações do site público. */
export const EASE = [0.22, 1, 0.36, 1] as const

const REVEAL_OFFSET_Y_PX = 28
/** Começa a revelar um pouco antes de o bloco entrar inteiro na tela. */
const REVEAL_VIEWPORT_MARGIN = "-80px"

interface EntranceMotionOptions {
  offsetY: number
  durationSeconds?: number
  delaySeconds?: number
}

/** Entrada ao montar (sobe e aparece), usada nos cabeçalhos das páginas. */
export function entranceMotion({
  offsetY,
  durationSeconds = 0.8,
  delaySeconds = 0,
}: EntranceMotionOptions): MotionProps {
  return {
    initial: { opacity: 0, y: offsetY },
    animate: { opacity: 1, y: 0 },
    transition: { duration: durationSeconds, ease: EASE, delay: delaySeconds },
  }
}

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
}

/** Sobe e aparece quando o bloco entra na área visível (uma vez só). */
export function Reveal({ children, className, delay = 0 }: RevealProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: REVEAL_VIEWPORT_MARGIN })
  const hidden = { opacity: 0, y: REVEAL_OFFSET_Y_PX }

  return (
    <motion.div
      ref={ref}
      initial={hidden}
      animate={isInView ? { opacity: 1, y: 0 } : hidden}
      transition={{ duration: 0.7, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

/** Variantes de um item de `<Stagger>` para quando o item precisa ser outro elemento `motion` (ex.: `motion.a`). */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

interface StaggerProps {
  children: ReactNode
  className?: string
  /** Fração do contêiner visível para disparar a animação. */
  amount?: number
}

/** Grade ou lista cujos filhos `motion` diretos aparecem em sequência ao rolar. */
export function Stagger({ children, className, amount = 0.2 }: StaggerProps): React.JSX.Element {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface StaggerItemProps {
  children: ReactNode
  className?: string
  whileHover?: MotionProps["whileHover"]
}

/** Item de `<Stagger>`; precisa ser filho direto dele. */
export function StaggerItem({ children, className, whileHover }: StaggerItemProps): React.JSX.Element {
  return (
    <motion.div variants={staggerItem} {...definedProps({ whileHover, className })}>
      {children}
    </motion.div>
  )
}

interface GrowBarProps {
  percent: number
  delay?: number
  className?: string
}

/** Barra horizontal que cresce até `percent`% ao entrar na tela. */
export function GrowBar({ percent, delay = 0, className }: GrowBarProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ width: 0 }}
      whileInView={{ width: `${percent}%` }}
      viewport={{ once: true }}
      transition={{ duration: 1, delay, ease: EASE }}
      className={className}
    />
  )
}

export { motion }
