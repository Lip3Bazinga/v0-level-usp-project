import { createTypeScriptConfig, REACT_RULES } from "@levelusp/eslint-config"
import nextVitals from "eslint-config-next/core-web-vitals"
import tseslint from "typescript-eslint"

const config = [
  ...nextVitals,
  ...createTypeScriptConfig({
    tseslint,
    tsconfigRootDir: import.meta.dirname,
    allowDefaultProject: ["vitest.config.mts"],
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/pyodide/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
    cliScripts: ["scripts/**"],
    documented: { files: ["src/lib/**/*.ts", "src/hooks/**/*.ts"] },
  }),
  { rules: REACT_RULES },
]

export default config
