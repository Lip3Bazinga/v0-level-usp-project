import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "public/pyodide-worker*.js", "next-env.d.ts", "playwright-report/**", "test-results/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // useAsyncResource recebe um array de dependências como o useEffect.
      "react-hooks/exhaustive-deps": ["warn", { additionalHooks: "useAsyncResource" }],
      // Regras do React Compiler: ainda há padrões antigos de efeitos e refs nas
      // telas, então ficam como aviso até a refatoração terminar (docs/v2/divida-tecnica.md).
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
