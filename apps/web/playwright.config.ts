import { defineConfig, devices } from "@playwright/test"

/**
 * Testes ponta a ponta (navegador real) contra a pilha completa:
 * web + api + runner + PostgreSQL com o seed de homologação.
 *   E2E_BASE_URL=http://localhost:3000 pnpm --filter @levelusp/web test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Permite usar um Chromium já instalado (ex.: sandbox sem download de navegadores).
        launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
      },
    },
  ],
})
