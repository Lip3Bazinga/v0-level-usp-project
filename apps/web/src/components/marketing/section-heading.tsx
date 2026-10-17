import { Reveal } from "./motion-primitives"

interface SectionIntroProps {
  eyebrow: string
  title: string
  description: string
}

/** Abertura das seções da página inicial: sobretítulo, título grande e parágrafo. */
export function SectionIntro({ eyebrow, title, description }: SectionIntroProps) {
  return (
    <Reveal className="mx-auto max-w-3xl text-center">
      <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-level-purple">
        {eyebrow}
      </p>
      <h2 className="text-balance text-4xl font-bold text-level-purple-dark sm:text-5xl">
        {title}
      </h2>
      <p className="mt-6 text-pretty text-lg leading-relaxed text-gray-600">{description}</p>
    </Reveal>
  )
}

interface SectionHeadingProps {
  title: string
  description: string
  /** Largura e espaçamento variam por página; o padrão é o bloco centralizado mais comum. */
  className?: string
}

/** Título e subtítulo das seções das páginas institucionais. */
export function SectionHeading({
  title,
  description,
  className = "mx-auto mb-12 max-w-2xl text-center",
}: SectionHeadingProps) {
  return (
    <Reveal className={className}>
      <h2 className="text-3xl font-bold text-level-purple-dark sm:text-4xl">{title}</h2>
      <p className="mt-4 text-lg text-gray-600">{description}</p>
    </Reveal>
  )
}
