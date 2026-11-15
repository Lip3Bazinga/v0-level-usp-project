"use client"

import { useState } from "react"
import { PlayCircle } from "lucide-react"
import type { VideoEmbed as VideoEmbedTarget, VideoProvider } from "@/lib/utils/rich-markdown"

const PROVIDER_LABELS: Readonly<Record<VideoProvider, string>> = { youtube: "YouTube", vimeo: "Vimeo" }

interface VideoEmbedProps {
  title: string
  /** Vídeo já conferido por `parseVideoEmbedUrl` (só YouTube sem cookies e Vimeo). */
  video: VideoEmbedTarget
}

/**
 * Vídeo de `::video[título](url)`. O iframe só é criado depois do clique: antes disso nenhum
 * pedido sai para o serviço de vídeo. O resumo em texto vem logo depois, no próprio Markdown.
 */
export function VideoEmbed({ title, video }: VideoEmbedProps): React.JSX.Element {
  const [isLoaded, setIsLoaded] = useState(false)
  const provider = PROVIDER_LABELS[video.provider]

  return (
    <figure className="my-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-900">
        {isLoaded ? (
          <iframe
            src={video.url}
            title={title}
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="fullscreen; picture-in-picture; encrypted-media"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsLoaded(true)}
            className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
          >
            <PlayCircle className="h-12 w-12" aria-hidden="true" />
            <span className="text-sm font-semibold">Assistir ao vídeo: {title}</span>
            <span className="text-xs text-gray-300">O vídeo é carregado do {provider} só depois do clique.</span>
          </button>
        )}
      </div>
      <figcaption className="mt-1 text-xs text-muted-foreground">Vídeo ({provider}): {title}</figcaption>
    </figure>
  )
}
