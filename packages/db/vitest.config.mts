import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    projects: [
      // Funções puras (pacote → linhas), sem banco: roda em `pnpm test`.
      { test: { name: "unit", include: ["test/seed-content.test.ts"], environment: "node" } },
      // Importação contra PostgreSQL real e migrado (TEST_DATABASE_URL), como os e2e da API: `pnpm test:db`.
      { test: { name: "db", include: ["test/content-import.test.ts"], environment: "node", fileParallelism: false, testTimeout: 30_000 } },
    ],
  },
})
