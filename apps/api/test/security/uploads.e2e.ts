import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { readdir } from "node:fs/promises"
import { sql } from "drizzle-orm"
import type { Test as HttpTest } from "supertest"
import type { UploadedImage } from "@levelusp/contracts"
import { bodyOf, countRows, createTestApp, CSRF_HEADER_NAME, signUp, type Agent, type SignedUpUser, type TestContext } from "../e2e/harness"

/*
 * Upload de arquivos: poliglotas (PNG + HTML/JS), SVG com script, MIME
 * forjado, nome de arquivo com travessia, tamanho, cota e multipart abusivo.
 */

const UPLOAD_DIR = "/tmp/levelusp-test-uploads"
/** PNG 1×1 válido. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64")
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(document.cookie)"><script>alert(1)</script></svg>')
/** Assinatura PNG seguida de HTML com script: o clássico poliglota. */
const POLYGLOT = Buffer.concat([PNG.subarray(0, 8), Buffer.from("<html><script>alert(document.cookie)</script></html>")])
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function upload(uploader: Agent, content: Buffer, fileName: string, contentType?: string): HttpTest {
  return uploader.raw
    .post("/api/uploads/images")
    .set(CSRF_HEADER_NAME, "1")
    .attach("file", content, contentType ? { filename: fileName, contentType } : fileName)
}

describe("Uploads sob ataque", () => {
  let ctx: TestContext
  let user: SignedUpUser

  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(async () => {
    await ctx.reset()
    user = await signUp(ctx.app)
  })

  it("SVG (com script) e HTML são recusados, qualquer que seja o MIME declarado", async () => {
    for (const [content, name, type] of [
      [SVG, "a.svg", "image/svg+xml"],
      [SVG, "a.png", "image/png"],
      [Buffer.from("<html><script>alert(1)</script></html>"), "a.html", "text/html"],
      [Buffer.from("GIF89a<script>alert(1)</script>"), "a.gif", "image/gif"],
    ] as const) {
      const response = await upload(user.agent, content, name, type)
      expect(response.status).toBe(400)
    }
    expect(await countRows(ctx.db, sql`select count(*)::int as n from uploads`)).toBe(0)
  })

  it("poliglota PNG+HTML é servido como image/png com nosniff e CSP que bloqueia script", async () => {
    const response = await upload(user.agent, POLYGLOT, "x.html", "text/html")
    expect(response.status).toBe(201)
    const { url } = bodyOf<UploadedImage>(response)
    expect(url).toMatch(/^\/api\/files\/[0-9a-f-]{36}\.png$/)
    const served = await user.agent.get(url)
    expect(served.headers["content-type"]).toBe("image/png")
    expect(served.headers["x-content-type-options"]).toBe("nosniff")
    expect(served.headers["content-security-policy"]).toMatch(/default-src 'none'/)
    expect(served.headers["content-disposition"] ?? "").not.toMatch(/\.html/)
  })

  it("nome do arquivo enviado nunca vira caminho em disco (travessia e caracteres de controle)", async () => {
    for (const name of ["../../../../tmp/pwned.png", "..\\..\\pwned.png", "/etc/cron.d/x.png", "a\u0000.png", "%2e%2e%2fpwned.png"]) {
      const response = await upload(user.agent, PNG, name, "image/png")
      // Aceito (com nome UUID gerado no servidor) ou recusado: nunca gravado com o nome enviado.
      expect([201, 400]).toContain(response.status)
      if (response.status === 201) expect(bodyOf<UploadedImage>(response).url).toMatch(/^\/api\/files\/[0-9a-f-]{36}\.png$/)
    }
    const stored = await readdir(UPLOAD_DIR)
    expect(stored.every((name) => /^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(name))).toBe(true)
  })

  it("arquivo acima de 2 MB é recusado sem gravar nada", async () => {
    const huge = Buffer.concat([PNG, Buffer.alloc(MAX_IMAGE_BYTES)])
    const response = await upload(user.agent, huge, "big.png", "image/png")
    expect([400, 413]).toContain(response.status)
    expect(await countRows(ctx.db, sql`select count(*)::int as n from uploads`)).toBe(0)
  })

  it("multipart abusivo (vários arquivos, muitos campos de texto) é recusado", async () => {
    const twoFiles = await user.agent.raw.post("/api/uploads/images").set(CSRF_HEADER_NAME, "1").attach("file", PNG, "a.png").attach("file", PNG, "b.png")
    expect(twoFiles.status).toBeGreaterThanOrEqual(400)
    let manyFields = user.agent.raw.post("/api/uploads/images").set(CSRF_HEADER_NAME, "1")
    for (let index = 0; index < 50; index++) manyFields = manyFields.field(`campo${index}`, "x".repeat(10_000))
    const flooded = await manyFields.attach("file", PNG, "a.png")
    expect(flooded.status).toBeGreaterThanOrEqual(400)
    expect(flooded.status).toBeLessThan(500)
    const wrongField = await user.agent.raw.post("/api/uploads/images").set(CSRF_HEADER_NAME, "1").attach("avatar", PNG, "a.png")
    expect(wrongField.status).toBeGreaterThanOrEqual(400)
    expect(wrongField.status).toBeLessThan(500)
  })

  it("cota por usuário: o 31º envio na hora é recusado", async () => {
    const statuses: number[] = []
    for (let index = 0; index < 31; index++) statuses.push((await upload(user.agent, PNG, "a.png", "image/png")).status)
    expect(statuses.slice(0, 30).every((status) => status === 201)).toBe(true)
    expect(statuses[30]).toBe(429)
  })

  it("avatar não aceita URL externa (rastreador de IP de quem vê o ranking público)", async () => {
    for (const avatarUrl of ["https://rastreador.example/pixel.png?aluno=1", "https://169.254.169.254/latest/meta-data/", "http://evil.example/a.png", "//evil.example/a.png", "javascript:alert(1)", "data:image/svg+xml,<svg onload=alert(1)>"]) {
      const response = await user.agent.patch("/api/me/profile", { avatar_url: avatarUrl })
      expect(response.status).toBe(400)
    }
    const own = bodyOf<UploadedImage>(await upload(user.agent, PNG, "a.png", "image/png")).url
    expect((await user.agent.patch("/api/me/profile", { avatar_url: own })).status).toBe(200)
    expect((await user.agent.patch("/api/me/profile", { avatar_url: null })).status).toBe(200)
  })

  it("upload exige sessão e o cabeçalho anti-CSRF (formulário multipart de outro site)", async () => {
    const withoutCsrf = await user.agent.raw.post("/api/uploads/images").attach("file", PNG, "a.png")
    expect(withoutCsrf.status).toBe(403)
  })
})
