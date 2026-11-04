import { createTypeScriptConfig } from "@levelusp/eslint-config"
import tseslint from "typescript-eslint"

export default tseslint.config(
  ...createTypeScriptConfig({
    tseslint,
    tsconfigRootDir: import.meta.dirname,
    ignores: ["migrations/**", "seed/**", "tools/**"],
    cliScripts: ["src/scripts/**"],
    documented: { files: ["src/**/*.ts"] },
  }),
)
