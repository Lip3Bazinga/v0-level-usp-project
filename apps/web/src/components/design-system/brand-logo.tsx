import type { ReactNode } from "react"
import Link from "next/link"
import { Rocket } from "lucide-react"
import { cn } from "@/lib/utils"

export type BrandSize = "sm" | "md" | "lg" | "xl" | "hero"

const MARK_SIZE_CLASS: Record<BrandSize, { tile: string; icon: string }> = {
  sm: { tile: "h-8 w-8", icon: "h-4 w-4" },
  md: { tile: "h-10 w-10", icon: "h-5 w-5" },
  lg: { tile: "h-11 w-11", icon: "h-6 w-6" },
  xl: { tile: "h-12 w-12", icon: "h-6 w-6" },
  hero: { tile: "h-20 w-20 rounded-2xl", icon: "h-10 w-10" },
}

const WORDMARK_SIZE_CLASS: Record<Exclude<BrandSize, "hero">, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-xl",
  xl: "text-2xl",
}

interface BrandMarkProps {
  size?: BrandSize
  /** Ajustes do quadrado (sombra, cantos, fundo translúcido). */
  className?: string | undefined
}

/** Quadrado roxo com o foguete: o símbolo da marca, sozinho ou ao lado do nome. */
export function BrandMark({ size = "md", className }: BrandMarkProps): React.JSX.Element {
  const { tile, icon } = MARK_SIZE_CLASS[size]
  return (
    <div className={cn("flex items-center justify-center rounded-xl bg-level-purple", tile, className)}>
      <Rocket className={cn("text-white", icon)} aria-hidden="true" />
    </div>
  )
}

interface BrandLogoProps {
  size?: Exclude<BrandSize, "hero">
  /** Segunda linha abaixo do nome (ex.: "Iniciativa da USP"). */
  tagline?: ReactNode
  /** Com `href`, o logo vira um link (ex.: para o painel ou a página inicial). */
  href?: string
  "aria-label"?: string
  className?: string
  markClassName?: string
  wordmarkClassName?: string
  taglineClassName?: string
}

/** Símbolo + "LevelUSP". Todas as telas usam este componente para a marca não divergir. */
export function BrandLogo({
  size = "md",
  tagline,
  href,
  "aria-label": ariaLabel,
  className,
  markClassName,
  wordmarkClassName,
  taglineClassName,
}: BrandLogoProps): React.JSX.Element {
  const wordmarkClass = cn("font-bold text-level-purple-dark", WORDMARK_SIZE_CLASS[size], wordmarkClassName)
  const content = (
    <>
      <BrandMark size={size} className={markClassName} />
      {tagline ? (
        <div className="leading-tight">
          <span className={cn("block", wordmarkClass)}>LevelUSP</span>
          <span className={cn("block", taglineClassName)}>{tagline}</span>
        </div>
      ) : (
        <span className={wordmarkClass}>LevelUSP</span>
      )}
    </>
  )
  const wrapperClass = cn("flex items-center", size === "sm" ? "gap-2" : "gap-3", className)

  if (!href) return <div className={wrapperClass}>{content}</div>
  return (
    <Link href={href} aria-label={ariaLabel} className={wrapperClass}>
      {content}
    </Link>
  )
}
