import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

export type LevelButtonVariant = "primary" | "secondary" | "outline" | "ghost"
export type LevelButtonSize = "sm" | "md" | "lg"

interface LevelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: LevelButtonVariant
  size?: LevelButtonSize
  children: ReactNode
}

const BASE_CLASS =
  "relative font-semibold rounded-xl transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-level-purple disabled:opacity-50 disabled:cursor-not-allowed"

const VARIANT_CLASS: Record<LevelButtonVariant, string> = {
  primary: "bg-level-purple text-white btn-3d hover:bg-level-purple-dark",
  secondary: "bg-level-purple-light text-level-purple-dark hover:bg-level-purple-subtle",
  outline: "border-2 border-level-purple text-level-purple hover:bg-level-purple-light",
  ghost: "text-level-purple hover:bg-level-purple-light",
}

const SIZE_CLASS: Record<LevelButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
}

/**
 * Classes do botão da marca, para aplicar o mesmo visual a um `<Link>` (um botão dentro de um
 * link é HTML inválido e cria dois alvos de foco).
 */
export function levelButtonClasses(variant: LevelButtonVariant = "primary", size: LevelButtonSize = "md"): string {
  return cn(BASE_CLASS, VARIANT_CLASS[variant], SIZE_CLASS[size])
}

export function LevelButton({ variant = "primary", size = "md", className, children, ...buttonProps }: LevelButtonProps): React.JSX.Element {
  return (
    <button className={cn(levelButtonClasses(variant, size), className)} {...buttonProps}>
      {children}
    </button>
  )
}
