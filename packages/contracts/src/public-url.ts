/**
 * Regras da origem pública (PUBLIC_BASE_URL): o endereço que alunos e
 * professores digitam no navegador. Validada igual na API (links de e-mail e
 * do certificado em PDF) e no front (metadados Open Graph), na partida de cada um.
 */

/** Hosts que só existem na máquina local: links com eles quebram fora dela. */
const LOCAL_HOSTNAMES: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"])

/** Diz se o host é local (localhost, loopback ou *.localhost), proibido como origem pública em produção. */
export function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTNAMES.has(hostname.toLowerCase()) || hostname.toLowerCase().endsWith(".localhost")
}

/** Resultado da validação de uma origem pública: a origem normalizada ou o motivo da recusa. */
export type PublicOriginCheck = { ok: true; origin: string } | { ok: false; reason: string }

/**
 * Aceita só a origem (esquema + host + porta). Caminho, query e credenciais
 * são recusados: o front é servido na raiz do domínio e um "/" a mais geraria
 * links como `https://x//certificado/...`.
 */
export function parsePublicOrigin(raw: string): PublicOriginCheck {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, reason: `não é uma URL válida ("${raw}"). Exemplo: https://levelusp.exemplo.usp.br` }
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, reason: `use http:// ou https:// (recebido "${url.protocol}")` }
  if (url.username || url.password) return { ok: false, reason: "não inclua usuário ou senha na URL pública" }
  if (url.pathname !== "/" || url.search || url.hash) {
    return { ok: false, reason: `informe só a origem, sem caminho nem parâmetros (ex.: ${url.origin})` }
  }
  return { ok: true, origin: url.origin }
}

/** Em produção os links vão para alunos reais: exige HTTPS e um domínio público. */
export function productionOriginProblem(origin: string): string | null {
  const url = new URL(origin)
  if (url.protocol !== "https:") return `em produção a URL pública precisa ser https:// (recebido ${origin})`
  if (isLocalHostname(url.hostname)) return `em produção a URL pública não pode ser ${url.hostname}: os links de e-mail e do certificado quebrariam`
  return null
}
