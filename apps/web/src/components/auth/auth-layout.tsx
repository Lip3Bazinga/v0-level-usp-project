import type { ReactNode } from "react"
import Link from "next/link"
import { BrandLogo, BrandMark } from "@/components/design-system/brand-logo"
import { ROUTES } from "@/lib/constants"

/** Link de destaque das telas de autenticação. */
export const AUTH_LINK_CLASS =
  "font-semibold text-level-purple hover:text-level-purple-dark transition-colors"

interface AuthHeadingProps {
  as: "h1" | "h2"
  title: string
  description: string
}

export function AuthHeading({ as: Heading, title, description }: AuthHeadingProps) {
  return (
    <div className="mb-8">
      <Heading className="text-2xl font-bold text-level-purple-dark">{title}</Heading>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  )
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="bg-background px-4 text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

interface AuthFooterPromptProps {
  prompt: string
  href: string
  linkLabel: string
}

/** "Não tem uma conta? Cadastre-se" e afins, abaixo do formulário. */
export function AuthFooterPrompt({ prompt, href, linkLabel }: AuthFooterPromptProps) {
  return (
    <p className="mt-6 text-center text-sm text-muted-foreground">
      {prompt}{" "}
      <Link href={href} className={AUTH_LINK_CLASS}>
        {linkLabel}
      </Link>
    </p>
  )
}

interface AuthBrandPanelProps {
  description: string
  children: ReactNode
}

/** Coluna roxa com a marca, visível só em telas largas. */
export function AuthBrandPanel({ description, children }: AuthBrandPanelProps) {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-level-purple to-level-purple-dark items-center justify-center p-12">
      <div className="max-w-md text-center">
        <BrandMark size="hero" className="mx-auto mb-8 bg-white/10 backdrop-blur" />
        <h1 className="text-4xl font-bold text-white mb-4">
          <Link href={ROUTES.home} className="hover:underline">
            LevelUSP
          </Link>
        </h1>
        <p className="text-lg text-purple-200 leading-relaxed">{description}</p>
        {children}
      </div>
    </div>
  )
}

interface AuthSplitLayoutProps {
  brandPanel: ReactNode
  children: ReactNode
}

/** Login e cadastro: marca à esquerda (desktop) e formulário à direita. */
export function AuthSplitLayout({ brandPanel, children }: AuthSplitLayoutProps) {
  return (
    <main className="flex min-h-screen">
      {brandPanel}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <BrandLogo
            size="xl"
            href={ROUTES.home}
            aria-label="LevelUSP — página inicial"
            className="mb-8 justify-center lg:hidden"
          />
          {children}
        </div>
      </div>
    </main>
  )
}

interface AuthCenteredLayoutProps {
  title: string
  description: string
  children: ReactNode
}

/** Telas de senha: uma coluna centralizada com a marca, o título e o conteúdo. */
export function AuthCenteredLayout({ title, description, children }: AuthCenteredLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        <BrandLogo size="xl" className="mb-8 justify-center" />
        <AuthHeading as="h1" title={title} description={description} />
        {children}
      </div>
    </div>
  )
}
