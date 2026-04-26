/** @type {import('next').NextConfig} */
const nextConfig = {
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
        // Cache longo para assets estáticos do Pyodide worker
        source: "/pyodide-worker-v2.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ]
  },
}

export default nextConfig
