"use client"

import dynamic from "next/dynamic"

/**
 * `RichTextEditor` carregado sob demanda. O TipTap pesa ~130 KB (gzip): importá-lo
 * estaticamente no caderno flutuante (que está no layout raiz) colocava esse JS em todas
 * as páginas, inclusive login, site público e certificado.
 */
export const LazyRichTextEditor = dynamic(
  () => import("@/components/editor/rich-text-editor").then((editorModule) => editorModule.RichTextEditor),
  { ssr: false, loading: () => <div className="h-[280px] animate-pulse rounded-xl bg-muted/60" /> },
)
