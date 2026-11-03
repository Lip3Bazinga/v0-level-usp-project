import path from "node:path"
import { defineConfig } from "vitest/config"

/**
 * Ataques ao veredito com o executor REAL (RUNNER_URL/RUNNER_TOKEN) e o motor de
 * correção da API. Sem executor no ar, a suíte é pulada.
 * Uso (de apps/api): `RUNNER_URL=... RUNNER_TOKEN=... pnpm test:attacks`.
 */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(process.cwd(), "src") } },
  test: {
    name: "grading-attacks",
    environment: "node",
    include: ["test/security/grading-*.e2e.ts"],
    testTimeout: 120_000,
    fileParallelism: false,
  },
})
