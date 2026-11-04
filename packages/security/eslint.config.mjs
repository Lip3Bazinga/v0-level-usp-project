import { createTypeScriptConfig } from "@levelusp/eslint-config"
import tseslint from "typescript-eslint"

export default tseslint.config(
  ...createTypeScriptConfig({
    tseslint,
    tsconfigRootDir: import.meta.dirname,
    cliScripts: ["src/cli/**"],
    documented: { files: ["src/**/*.ts"] },
  }),
)
