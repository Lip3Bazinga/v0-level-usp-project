import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createTestApp, CSRF_HEADER_NAME, signUp, type Agent, type TestContext } from "./harness"

/** PNG 1×1 válido. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64")

describe("Uploads (e2e)", () => {
  let ctx: TestContext
  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(() => ctx.reset())

  const upload = (uploader: Agent, image: Buffer, fileName = "img.png") =>
    uploader.raw.post("/api/uploads/images").set(CSRF_HEADER_NAME, "1").attach("file", image, fileName)

  it("aceita imagem real e serve publicamente", async () => {
    const { agent } = await signUp(ctx.app)
    const response = await upload(agent, PNG)
    expect(response.status).toBe(201)
    const file = await agent.get(response.body.url)
    expect(file.status).toBe(200)
    expect(file.headers["content-type"]).toBe("image/png")
  })

  it("recusa arquivo que não é imagem, mesmo com extensão .png", async () => {
    const { agent } = await signUp(ctx.app)
    const response = await upload(agent, Buffer.from("<script>alert(1)</script>"), "x.png")
    expect(response.status).toBe(400)
  })

  it("não deixa usar (nem apagar) a imagem de outra pessoa", async () => {
    const victim = await signUp(ctx.app)
    const { url } = (await upload(victim.agent, PNG)).body
    await victim.agent.patch("/api/me/profile", { avatar_url: url })

    const teacher = await signUp(ctx.app, "teacher", ctx.db)
    const course = await teacher.agent.post("/api/courses", { title: "Curso de teste" })
    const hijack = await teacher.agent.patch(`/api/courses/${course.body.id}`, { cover_image_url: url })
    expect(hijack.status).toBe(403)
    expect((await victim.agent.get(url)).status).toBe(200)
  })

  it("troca de avatar apaga a imagem antiga do próprio usuário", async () => {
    const { agent } = await signUp(ctx.app)
    const oldAvatar = (await upload(agent, PNG)).body.url
    const newAvatar = (await upload(agent, PNG)).body.url
    expect((await agent.patch("/api/me/profile", { avatar_url: oldAvatar })).status).toBe(200)
    expect((await agent.patch("/api/me/profile", { avatar_url: newAvatar })).status).toBe(200)
    expect((await agent.get(oldAvatar)).status).toBe(404)
  })
})
