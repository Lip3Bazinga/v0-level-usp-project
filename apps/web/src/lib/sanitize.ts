import DOMPurify from "dompurify"

/**
 * Defesa em profundidade contra XSS: a API já sanitiza o HTML das lições ao
 * gravar; aqui sanitizamos de novo antes de injetar no DOM (conteúdo antigo,
 * importado do Supabase, pode não ter passado pela API).
 */
export function sanitizeLessonHtml(html: string): string {
  if (typeof window === "undefined") return ""
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ["style", "form", "input"], FORBID_ATTR: ["style"] })
}
