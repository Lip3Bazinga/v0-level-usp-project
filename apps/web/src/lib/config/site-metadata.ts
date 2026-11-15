import type { Metadata } from "next"

const SITE_NAME = "LevelUSP"
const DEFAULT_TITLE = "LevelUSP — Aprenda Python Gratuitamente"
const OG_IMAGE_PATH = "/og-image.png"

/** Metadados do site com a origem pública como base dos links absolutos (Open Graph, canonical). */
export function buildRootMetadata(publicBaseUrl: string): Metadata {
  return {
    metadataBase: new URL(publicBaseUrl),
    title: {
      default: DEFAULT_TITLE,
      template: `%s | ${SITE_NAME}`,
    },
    description:
      "LevelUSP é uma plataforma gratuita e gamificada para aprender Python, do zero à IA. Projeto de TCC desenvolvido no DCM/FFCLRP-USP.",
    keywords: [
      "programação",
      "Python",
      "USP",
      "educação",
      "computação",
      "Brasil",
      "gratuito",
      "aprender a programar",
    ],
    authors: [{ name: "Filipe Pio Magalhães" }],
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: publicBaseUrl,
      siteName: SITE_NAME,
      title: DEFAULT_TITLE,
      description:
        "Plataforma gratuita e gamificada de programação. Aprenda Python com exercícios interativos e ganhe XP!",
      images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: DEFAULT_TITLE,
      description: "Plataforma gratuita e gamificada de programação.",
      images: [OG_IMAGE_PATH],
    },
    icons: {
      icon: [
        { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
        { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
        { url: "/icon.svg", type: "image/svg+xml" },
      ],
      apple: "/apple-icon.png",
    },
  }
}
