import path from "node:path"

const PYODIDE_ORIGIN = "https://cdn.jsdelivr.net"
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' ${PYODIDE_ORIGIN}`,
  "worker-src 'self' blob:",
  `connect-src 'self' ${PYODIDE_ORIGIN}`,
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ")

/** @type {import('next').NextConfig} */
const nextConfig = {
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

  // Headers de segurança para produção
  async headers() {
    return [
      {
        // /api/* já recebe cabeçalhos próprios da API (ex.: CSP do PDF do certificado).
        source: "/((?!api/).*)",
        headers: [
          { key: "X-Content-Type-Options",   value: "nosniff" },
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
          // CSP: impede exfiltração para domínios externos e plugins. 'unsafe-eval' e
          // 'wasm-unsafe-eval' são exigidos pelo Pyodide (WebAssembly no navegador).
          { key: "Content-Security-Policy",   value: CSP },
        ],
      },
      {
        source: "/pyodide-worker-v2.js",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      {
        // Arquivos Pyodide self-hosted: imutáveis por versão, cache de 1 ano
        source: "/pyodide/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
}

export default nextConfig
