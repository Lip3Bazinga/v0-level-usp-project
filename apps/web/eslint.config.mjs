import { FlatCompat } from "@eslint/eslintrc"

// ESLint 9 (flat config) com as regras oficiais do Next.js.
// Rodar: pnpm lint · CI: job "lint" (informativo até zerarmos os avisos)
const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/pyodide/**",
      "public/pyodide-worker*.js",
      "next-env.d.ts",
    ],
  },
]

export default config
