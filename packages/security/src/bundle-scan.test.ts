import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { canaryRules, LEAK_RULES, scanNextBuild, scanText, secretLookingPublicVariables } from "./bundle-scan"

describe("varredura do bundle", () => {
  let webDir = ""
  afterEach(async () => {
    if (webDir) await rm(webDir, { recursive: true, force: true })
  })

  async function fakeBuild(files: Record<string, string>): Promise<string> {
    webDir = await mkdtemp(path.join(tmpdir(), "lvl-bundle-"))
    for (const [relative, content] of Object.entries(files)) {
      const target = path.join(webDir, relative)
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, content)
    }
    return webDir
  }

  it("acha segredo-canário, URL com senha, host interno e source map com código", async () => {
    const dir = await fakeBuild({
      ".next/static/chunks/a.js": 'const x="CanaryRunnerAAAA1111";fetch("http://api:4000/api/x")',
      ".next/static/chunks/b.js": 'const db="postgres://levelusp:segredo@postgres:5432/levelusp"',
      ".next/static/chunks/b.js.map": '{"version":3,"sources":["../src/lib/api.ts"],"sourcesContent":["…"]}',
      ".next/static/chunks/vazio.js.map": '{"version":3,"sources":[],"sections":[]}',
      ".next/server/app/index.html": "<html>process.env.RUNNER_TOKEN</html>",
      ".next/server/app/page.js": "RUNNER_TOKEN só no servidor não conta",
      ".next/routes-manifest.json": '{"rewrites":[{"destination":"http://api:4000/api/:path*"}]}',
    })
    const result = await scanNextBuild(dir, [...LEAK_RULES, ...canaryRules(["CanaryRunnerAAAA1111"])])
    expect(result.sourceMaps).toEqual([path.join(".next", "static", "chunks", "b.js.map")])
    const found = result.leaks.map((leak) => `${leak.file}: ${leak.rule}`).sort()
    expect(found).toEqual([
      `${path.join(".next", "server", "app", "index.html")}: variável de ambiente do servidor`,
      `${path.join(".next", "static", "chunks", "a.js")}: canário "Canary…"`,
      `${path.join(".next", "static", "chunks", "a.js")}: host interno do compose`,
      `${path.join(".next", "static", "chunks", "b.js")}: URL de banco com credencial`,
      `${path.join(".next", "static", "chunks", "b.js")}: host interno do compose`,
    ])
  })

  it("build limpo não acusa nada", async () => {
    const dir = await fakeBuild({ ".next/static/chunks/a.js": 'fetch("/api/courses");const k="NEXT_PUBLIC_PYODIDE_INDEX_URL"' })
    expect(await scanNextBuild(dir, LEAK_RULES)).toEqual({ scannedFiles: 1, sourceMaps: [], leaks: [] })
  })

  it("acusa chave privada e tokens de serviços conhecidos", () => {
    const text = "-----BEGIN PRIVATE KEY-----\nMIIE… ghp_abcdefghijklmnopqrstuvwxyz0123456789AB"
    expect(scanText("x.js", text, LEAK_RULES).map((leak) => leak.rule)).toEqual(["chave privada", "token de API comum (AWS/GitHub/Slack/Stripe/Google)"])
  })

  it("NEXT_PUBLIC_ com nome de segredo é acusado", () => {
    expect(secretLookingPublicVariables(["NEXT_PUBLIC_PYODIDE_INDEX_URL", "NEXT_PUBLIC_API_SECRET", "NEXT_PUBLIC_DATABASE_URL", "NEXT_PUBLIC_STRIPE_KEY"])).toEqual([
      "NEXT_PUBLIC_API_SECRET",
      "NEXT_PUBLIC_DATABASE_URL",
      "NEXT_PUBLIC_STRIPE_KEY",
    ])
  })
})
