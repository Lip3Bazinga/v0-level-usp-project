import type { Metadata, Viewport } from "next"
import { connection } from "next/server"
import type { ReactNode } from "react"
import { Providers } from "@/components/providers"
import { NotesFloatingWidget } from "@/components/notes/notes-floating-widget"
import { resolvePublicBaseUrl } from "@/lib/config/server-urls"
import { buildRootMetadata } from "@/lib/config/site-metadata"
import "./globals.css"

const BRAND_PURPLE = "#7C3AED"

/**
 * Lida a cada requisição: a origem pública (PUBLIC_BASE_URL) é configuração da VM,
 * não do build da imagem. `connection()` impede que o Next congele no build o
 * endereço local nas páginas pré-renderizadas.
 */
export async function generateMetadata(): Promise<Metadata> {
  await connection()
  return buildRootMetadata(resolvePublicBaseUrl(process.env))
}

export const viewport: Viewport = {
  themeColor: BRAND_PURPLE,
  width: "device-width",
  initialScale: 1,
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: Readonly<RootLayoutProps>): React.JSX.Element {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          {children}
          <NotesFloatingWidget />
        </Providers>
      </body>
    </html>
  )
}
