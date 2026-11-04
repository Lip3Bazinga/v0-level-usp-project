import { createTypeScriptConfig } from "@levelusp/eslint-config"
import tseslint from "typescript-eslint"

export default tseslint.config(
  ...createTypeScriptConfig({
    tseslint,
    tsconfigRootDir: import.meta.dirname,
    allowDefaultProject: ["vitest.config.ts"],
    ignores: ["python/**"],
    documented: { files: ["src/**/*.ts"] },
  }),
)
