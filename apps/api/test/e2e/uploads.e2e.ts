import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createTestApp, signUp, type TestContext } from "./harness"

// PNG 1×1 válido
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64")

describe("Uploads (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  const upload = (a: Awaited<ReturnType<typeof signUp>>["agent"], buf: Buffer, name = "img.png") =>
    a.raw.post("/api/uploads/images").set("x-levelusp-csrf", "1").attach("file", buf, name)

  it("aceita imagem real e serve publicamente", async () => {
    const { agent } = await signUp(ctx.app)
    const res = await upload(agent, PNG)
    expect(res.status).toBe(201)
    const file = await agent.get(res.body.url)
    expect(file.status).toBe(200)
    expect(file.headers["content-type"]).toBe("image/png")
  })

  it("recusa arquivo que não é imagem, mesmo com extensão .png", async () => {
    const { agent } = await signUp(ctx.app)
    const res = await upload(agent, Buffer.from("<script>alert(1)</script>"), "x.png")
    expect(res.status).toBe(400)
  })

  it("não deixa usar (nem apagar) a imagem de outra pessoa", async () => {
    const vitima = await signUp(ctx.app)
    const { url } = (await upload(vitima.agent, PNG)).body
    await vitima.agent.patch("/api/me/profile", { avatar_url: url })

    const prof = await signUp(ctx.app, "teacher", ctx.db)
    const course = await prof.agent.post("/api/courses", { title: "Curso de teste" })
    const hijack = await prof.agent.patch(`/api/courses/${course.body.id}`, { cover_image_url: url })
    expect(hijack.status).toBe(403)
    expect((await vitima.agent.get(url)).status).toBe(200)
  })

  it("troca de avatar apaga a imagem antiga do próprio usuário", async () => {
    const { agent } = await signUp(ctx.app)
    const a = (await upload(agent, PNG)).body.url
    const b = (await upload(agent, PNG)).body.url
    expect((await agent.patch("/api/me/profile", { avatar_url: a })).status).toBe(200)
    expect((await agent.patch("/api/me/profile", { avatar_url: b })).status).toBe(200)
    expect((await agent.get(a)).status).toBe(404)
  })
})
