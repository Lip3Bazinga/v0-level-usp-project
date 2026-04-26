import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Providers } from '@/components/providers'
import './globals.css'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levelusp.com.br'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'LevelUSP — Aprenda Python Gratuitamente',
    template: '%s | LevelUSP',
  },
  description: 'LevelUSP é uma iniciativa da USP para expandir o conhecimento de programação por todo o Brasil. Aprenda Python de forma gratuita e gamificada.',
  keywords: ['programação', 'Python', 'USP', 'educação', 'computação', 'Brasil', 'gratuito', 'aprender a programar'],
  authors: [{ name: 'Universidade de São Paulo' }],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: BASE_URL,
    siteName: 'LevelUSP',
    title: 'LevelUSP — Aprenda Python Gratuitamente',
    description: 'Plataforma gratuita e gamificada de programação da USP. Aprenda Python com exercícios interativos e ganhe XP!',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'LevelUSP' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LevelUSP — Aprenda Python Gratuitamente',
    description: 'Plataforma gratuita e gamificada de programação da USP.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png',  media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#7C3AED',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
