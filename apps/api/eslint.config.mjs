import { createTypeScriptConfig } from "@levelusp/eslint-config"
import tseslint from "typescript-eslint"

export default tseslint.config(
  ...createTypeScriptConfig({
    tseslint,
    tsconfigRootDir: import.meta.dirname,
    allowDefaultProject: ["vitest.config.mts", "scripts/*.mts"],
    documented: {
      files: ["src/**/*.ts"],
      ignores: ["src/main.ts", "src/**/*.controller.ts", "src/**/*.module.ts", "src/modules/index.ts"],
    },
  }),
)
