import { readFileSync } from "node:fs"
import path from "node:path"

/*
 * Origens do Python do botão "Executar" (ver src/lib/python/runtime-config.ts).
 * O núcleo do Pyodide é servido pelo próprio site (/pyodide/v<versão>/), então
 * nenhum script de terceiros entra na página. Só os wheels dos pacotes extras
 * (numpy, matplotlib…) vêm do CDN oficial — e só via fetch (connect-src).
 * Se NEXT_PUBLIC_PYODIDE_INDEX_URL apontar para fora, essa origem é liberada também.
 */
const runtimeManifest = JSON.parse(
  readFileSync(new URL("./src/lib/python/pyodide-runtime.json", import.meta.url), "utf8"),
)
const DEFAULT_PYODIDE_PACKAGE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${runtimeManifest.version}/full/`

/** Origem de uma URL absoluta; URL relativa (mesma origem) devolve null. */
function externalOrigin(url) {
  if (!url || !/^https?:\/\//.test(url)) return null
  return new URL(url).origin
}

const pyodideIndexOrigin = externalOrigin(process.env.NEXT_PUBLIC_PYODIDE_INDEX_URL)
const pyodidePackageOrigin = externalOrigin(
  process.env.NEXT_PUBLIC_PYODIDE_PACKAGE_BASE_URL || DEFAULT_PYODIDE_PACKAGE_BASE_URL,
)
const scriptOrigins = [pyodideIndexOrigin].filter(Boolean)
const connectOrigins = [...new Set([pyodideIndexOrigin, pyodidePackageOrigin].filter(Boolean))]

/*
 * Vídeos das lições (`::video[título](url)`): só estes dois reprodutores podem ser carregados em
 * iframe. São as MESMAS origens que o player confere antes de criar o iframe
 * (VIDEO_EMBED_ORIGINS em src/lib/utils/rich-markdown.ts) — mudou um lado, mude o outro.
 */
const VIDEO_FRAME_ORIGINS = ["https://www.youtube-nocookie.com", "https://player.vimeo.com"]

/*
 * O que os recursos de apresentação das aulas exigem da CSP (nada além do que já havia, fora o frame-src):
 * - KaTeX: o CSS e as fontes (.woff2) vêm do pacote npm e são servidos em /_next/static → 'self'
 *   em style-src e font-src. As fórmulas usam atributos style inline → 'unsafe-inline' em style-src.
 * - Mermaid: carregado como chunk do próprio site (script-src 'self'); o SVG gerado traz uma tag
 *   <style> e atributos style → o mesmo 'unsafe-inline' de style-src. Não busca nada na rede.
 * - Imagens das lições: /api/content/assets/… (mesma origem) → 'self' em img-src.
 * - Visualizador de execução: roda no mesmo worker do Pyodide (worker-src e script-src abaixo).
 */
const CSP = [
  "default-src 'self'",
  ["script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'", ...scriptOrigins].join(" "),
  "worker-src 'self' blob:",
  ["connect-src 'self'", ...connectOrigins].join(" "),
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  // Sem 'self': o site não se incorpora em iframe e nenhuma outra origem é aceita.
  ["frame-src", ...VIDEO_FRAME_ORIGINS].join(" "),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ")

/**
 * HSTS só em produção: depois de visto uma vez, o navegador recusa HTTP para o domínio
 * por um ano — em desenvolvimento (http://localhost) isso só atrapalharia.
 */
const HSTS_HEADERS =
  process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sem "X-Powered-By: Next.js": não anunciar o framework facilita menos a escolha de exploits.
  poweredByHeader: false,
  // Source maps do cliente nunca são publicados (o código-fonte não vai para o navegador).
  productionBrowserSourceMaps: false,

  // Imagem Docker enxuta (server.js + dependências mínimas em .next/standalone).
  output: "standalone",
  // Monorepo: o rastreamento de arquivos parte da raiz para incluir packages/*.
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),

  // O navegador fala só com a mesma origem (/api/*); o Next repassa para a API.
  // Atenção: rewrites são resolvidos no BUILD — a imagem Docker usa http://api:4000.
  // Assim o cookie de sessão (httpOnly) é de primeira parte e nenhum token
  // fica exposto ao JavaScript.
  async rewrites() {
    const apiUrl = (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(/\/+$/, "")
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }]
  },

  // A antiga página "Configurações" foi para dentro do perfil; links e favoritos antigos continuam funcionando.
  async redirects() {
    return [
      { source: "/settings", destination: "/perfil/me/conta", permanent: true },
      // A página de impacto trazia números sem fonte e foi retirada.
      { source: "/impacto", destination: "/sobre", permanent: true },
    ]
  },

  // Headers de segurança para produção
  async headers() {
    return [
      {
        // /api/* já recebe cabeçalhos próprios da API (ex.: CSP do PDF do certificado).
        source: "/((?!api/).*)",
        headers: [
          { key: "X-Content-Type-Options",   value: "nosniff" },
          { key: "X-Frame-Options",           value: "DENY" },
          // O filtro XSS legado dos navegadores foi removido e já serviu de canal de vazamento;
          // a recomendação atual (OWASP) é desligá-lo e confiar na CSP.
          { key: "X-XSS-Protection",          value: "0" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
          // CSP: impede exfiltração para domínios externos e plugins. 'unsafe-eval' e
          // 'wasm-unsafe-eval' são exigidos pelo Pyodide (WebAssembly no navegador).
          { key: "Content-Security-Policy",   value: CSP },
          ...HSTS_HEADERS,
        ],
      },
      {
        // Núcleo do Pyodide: o caminho já carrega a versão, então o arquivo nunca muda.
        source: "/pyodide/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
}

export default nextConfig
