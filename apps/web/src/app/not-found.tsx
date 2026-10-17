import Link from "next/link"
import { Rocket, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-level-purple">
          <Rocket className="h-10 w-10 text-white" aria-hidden="true" />
        </div>
        <h1 className="text-6xl font-extrabold text-level-purple">404</h1>
        <h2 className="mt-3 text-2xl font-bold text-level-purple-dark">Página não encontrada</h2>
        <p className="mt-2 text-muted-foreground">
          Esta página não existe ou foi movida.
        </p>
        {/* Visitante ia para /dashboard e caía no login: agora há as duas saídas. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-level-purple px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark"
          >
            <ArrowLeft className="h-4 w-4" />
            Página inicial
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-level-purple-dark transition-colors hover:border-level-purple"
          >
            Ir para o painel
          </Link>
        </div>
      </div>
    </main>
  )
}
