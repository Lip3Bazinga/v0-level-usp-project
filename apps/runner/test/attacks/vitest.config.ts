import path from "node:path"
import { defineConfig } from "vitest/config"

/**
 * Suíte adversarial do executor (lenta: sobe dezenas de instâncias WASI reais).
 * Fora do `pnpm test`; roda com `pnpm --filter @levelusp/runner test:attacks` e no CI.
 */
export default defineConfig({
  root: path.resolve(import.meta.dirname, "../.."),
  test: {
    environment: "node",
    include: ["test/attacks/**/*.attack.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Máquina de 2 CPUs: um arquivo por vez; cada teste já sobe instâncias próprias.
    fileParallelism: false,
  },
})
