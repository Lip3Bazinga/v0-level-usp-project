import sanitizeHtml from "sanitize-html"

/** Conteúdo que começa com uma tag é HTML (editor rico); senão, Markdown. */
export function isHtmlContent(text: string): boolean {
  return /^\s*<[a-zA-Z]/.test(text)
}

/**
 * Sanitiza o conteúdo rico escrito por professores antes de gravar.
 * Lista de permissões compatível com a saída do editor TipTap: sem scripts,
 * sem atributos de evento (onerror, onclick…), sem javascript: em links.
 * Markdown é mantido como está — o front o renderiza sem HTML bruto.
 */
export function sanitizeRichContent(content: string): string {
  if (!isHtmlContent(content)) return content
  return sanitizeHtml(content, {
    allowedTags: [
      "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s", "mark", "sub", "sup",
      "code", "pre", "blockquote", "ul", "ol", "li", "a", "img", "span", "div", "table", "thead", "tbody", "tr", "th", "td",
      "figure", "figcaption",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      code: ["class"],
      pre: ["class"],
      span: ["class", "data-type"],
      div: ["class", "data-type"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      ol: ["start"],
      li: ["data-checked"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    allowProtocolRelative: false,
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }) },
  })
}
