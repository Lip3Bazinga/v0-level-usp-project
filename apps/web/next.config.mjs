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

const CSP = [
  "default-src 'self'",
  ["script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'", ...scriptOrigins].join(" "),
  "worker-src 'self' blob:",
  ["connect-src 'self'", ...connectOrigins].join(" "),
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
