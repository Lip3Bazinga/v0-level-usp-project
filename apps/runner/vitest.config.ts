import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 120_000,
    include: ["test/**/*.test.ts"],
    // Compila o worker do Pyodide antes dos testes (worker_threads só carrega JavaScript).
    globalSetup: ["test/setup/build-worker.ts"],
  },
})
