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
      "react-hooks/exhaustive-deps": ["error", { additionalHooks: "useAsyncResource" }],
      // As demais regras react-hooks/* (React Compiler) já são erro no preset; estas duas vêm como aviso.
      "react-hooks/incompatible-library": "error",
      "react-hooks/unsupported-syntax": "error",
    },
  },
]

export default config
