import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

// ESLint 9 (flat config) com as regras oficiais do Next.js.
const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "public/pyodide/**", "public/pyodide-worker*.js", "next-env.d.ts", "playwright-report/**", "test-results/**"],
  },
  {
    rules: {
      // Avisos herdados do código pré-refatoração; não bloqueiam o CI.
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // Regras do React Compiler (eslint-plugin-react-hooks 6+): padrões antigos do
      // código ficam como aviso até a refatoração gradual. Ver docs/v2/divida-tecnica.md.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/globals": "warn",
    },
  },
]

export default config
