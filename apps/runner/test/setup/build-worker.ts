/**
 * `globalSetup` do vitest: compila o worker do Pyodide (`src/pyodide-worker.ts`) para
 * `dist/pyodide-worker.js`, o mesmo arquivo que a produção usa. `worker_threads` só
 * carrega JavaScript, e assim os testes exercitam o artefato real sem exigir um
 * `pnpm build` antes de `pnpm test`.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "tsup"

const runnerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

export default async function buildPyodideWorker(): Promise<void> {
  if (process.env.SKIP_PYODIDE_TESTS === "1") return
  await build({
    entry: { "pyodide-worker": path.join(runnerDir, "src/pyodide-worker.ts") },
    outDir: path.join(runnerDir, "dist"),
    format: ["esm"],
    target: "node22",
    clean: false,
    silent: true,
    config: false,
    dts: false,
    sourcemap: false,
  })
}
