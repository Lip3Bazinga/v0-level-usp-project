/*
 * Regras puras do Markdown rico das lições (vídeo, diagrama, visualizador). O texto vem do
 * professor: tudo aqui decide por lista de permissão e, na dúvida, trata como texto comum.
 */

/** Serviços de vídeo aceitos em `::video[título](url)`. */
export type VideoProvider = "youtube" | "vimeo"

/** Vídeo aceito para incorporação: a URL já conferida e o serviço. */
export interface VideoEmbed {
  provider: VideoProvider
  /** URL exata do `src` do iframe (sem parâmetros, sem fragmento). */
  url: string
}

/** Marcador que abre a linha de vídeo no Markdown da lição. */
export const VIDEO_DIRECTIVE = "::video"

/** Origens dos iframes de vídeo; as MESMAS do `frame-src` da CSP em `next.config.mjs`. */
export const VIDEO_EMBED_ORIGINS: Readonly<Record<VideoProvider, string>> = {
  youtube: "https://www.youtube-nocookie.com",
  vimeo: "https://player.vimeo.com",
}

const VIDEO_PATH_PATTERNS: Readonly<Record<VideoProvider, RegExp>> = {
  youtube: /^\/embed\/[A-Za-z0-9_-]{6,20}$/,
  vimeo: /^\/video\/\d{1,15}$/,
}

const VIDEO_PROVIDERS: readonly VideoProvider[] = ["youtube", "vimeo"]

/**
 * Confere a URL de um vídeo. Só passam `https://www.youtube-nocookie.com/embed/<id>` e
 * `https://player.vimeo.com/video/<id>`, sem porta, credenciais, parâmetros ou fragmento.
 * Qualquer outra coisa devolve null e a linha é mostrada como texto.
 */
export function parseVideoEmbedUrl(rawUrl: string): VideoEmbed | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") return null
  const provider = VIDEO_PROVIDERS.find((candidate) => url.origin === VIDEO_EMBED_ORIGINS[candidate] && VIDEO_PATH_PATTERNS[candidate].test(url.pathname))
  // O `src` é remontado da origem fixa + caminho conferido, nunca copiado do texto do professor.
  return provider ? { provider, url: `${VIDEO_EMBED_ORIGINS[provider]}${url.pathname}` } : null
}

/** Linguagem do bloco de código que vira diagrama. */
export const MERMAID_LANGUAGE = "mermaid"

/** Palavra na linha de abertura do bloco (```python visualizar) que liga o visualizador de execução. */
export const VISUALIZER_META = "visualizar"

/** O que fazer com um bloco de código do Markdown. */
export type CodeBlockKind = "mermaid" | "visualizer" | "plain"

/**
 * Classifica um bloco de código pela linguagem e pelo resto da linha de abertura (`meta`):
 * `mermaid` vira diagrama; `python visualizar` ganha o visualizador; o resto é código comum.
 */
export function codeBlockKind(language: string | null, meta: string | null): CodeBlockKind {
  if (language === MERMAID_LANGUAGE) return "mermaid"
  const isPython = language === "python" || language === "py"
  if (isPython && (meta ?? "").split(/\s+/).includes(VISUALIZER_META)) return "visualizer"
  return "plain"
}
