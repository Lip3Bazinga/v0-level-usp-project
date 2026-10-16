"use client"

import { motion, useInView, type Variants, type MotionProps } from "framer-motion"
import { useRef, type ReactNode } from "react"

/* Shared easing curve for a smooth, premium feel */
const EASE = [0.22, 1, 0.36, 1] as const

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  once?: boolean
}

/** Fade + rise into view when scrolled into the viewport. */
export function Reveal({ children, className, delay = 0, y = 28, once = true }: RevealProps) {
  const ref = useRef(null)
  const inView = useInView(ref, { once, margin: "-80px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* Stagger container + item for lists/grids */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

interface StaggerProps {
  children: ReactNode
  className?: string
  amount?: number
}

/** Wrap a grid/list to stagger its direct `motion` children on scroll. */
export function Stagger({ children, className, amount = 0.2 }: StaggerProps) {
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

/** A single staggered item — use as a direct child of <Stagger>. */
export function StaggerItem({
  children,
  className,
  whileHover,
}: {
  children: ReactNode
  className?: string
  whileHover?: MotionProps["whileHover"]
}) {
  return (
    <motion.div variants={staggerItem} whileHover={whileHover} className={className}>
      {children}
    </motion.div>
  )
}

/** Animated horizontal bar that grows to `pct`% when scrolled into view. */
export function GrowBar({ pct, delay = 0, className }: { pct: number; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ width: 0 }}
      whileInView={{ width: `${pct}%` }}
      viewport={{ once: true }}
      transition={{ duration: 1, delay, ease: EASE }}
      className={className}
    />
  )
}

export { motion, EASE }
