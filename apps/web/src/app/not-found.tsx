import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { BrandMark } from "@/components/design-system/brand-logo"
import { ROUTES } from "@/lib/constants"

export default function NotFound(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <BrandMark size="hero" className="mx-auto mb-6" />
        <h1 className="text-6xl font-extrabold text-level-purple">404</h1>
        <h2 className="mt-3 text-2xl font-bold text-level-purple-dark">Página não encontrada</h2>
        <p className="mt-2 text-muted-foreground">
          Esta página não existe ou foi movida.
        </p>
        {/* Sem sessão, o painel redireciona para o login: o visitante precisa da página inicial. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={ROUTES.home}
            className="flex items-center gap-2 rounded-xl bg-level-purple px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            Página inicial
          </Link>
          <Link
            href={ROUTES.dashboard}
            className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-level-purple-dark transition-colors hover:border-level-purple"
          >
            Ir para o painel
          </Link>
        </div>
      </div>
    </main>
  )
}
