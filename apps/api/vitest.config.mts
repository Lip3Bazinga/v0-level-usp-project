import swc from "unplugin-swc"
import path from "node:path"
import { defineConfig } from "vitest/config"

const alias = { "@": path.resolve(import.meta.dirname, "src") }
const plugins = [swc.vite({ module: { type: "es6" } })]

export default defineConfig({
  test: {
    projects: [
      {
        plugins,
        resolve: { alias },
        test: { name: "unit", include: ["src/**/*.spec.ts", "test/unit/**/*.test.ts"], environment: "node" },
      },
      {
        plugins,
        resolve: { alias },
        test: {
          name: "e2e",
          include: ["test/e2e/**/*.e2e.ts"],
          environment: "node",
          globalSetup: ["test/e2e/global-setup.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
    coverage: { provider: "v8", include: ["src/**/*.ts"], exclude: ["src/main.ts", "src/**/*.module.ts"] },
  },
})
