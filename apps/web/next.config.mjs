/** @type {import('next').NextConfig} */
const nextConfig = {
  // O Next.js 16 gera um validator.ts em .next/dev/types/ com um comentário malformado
  // que o tsc lê como divisão aritmética. O erro é 100% codegen do framework —
  // ignorar aqui; o type-check real roda via tsc --noEmit (que exclui .next/).
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    // Permite imagens do Supabase Storage e outras origens externas
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Headers de segurança para produção
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",   value: "nosniff" },
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-XSS-Protection",          value: "1; mode=block" },
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
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
