import { describe, expect, it } from "vitest"
import { buildProfileUpdate } from "./profile-settings"

describe("buildProfileUpdate", () => {
  it("normaliza o nome e a bio e omite o username quando não mudou", () => {
    expect(buildProfileUpdate({ fullName: "  Ana  ", username: "ana", bio: "   " }, "ana")).toEqual({
      ok: true,
      input: { full_name: "Ana", bio: null },
    })
  })

  it("envia o novo username em minúsculas", () => {
    const update = buildProfileUpdate({ fullName: "Ana", username: " Ana_2 ", bio: "" }, "ana")
    expect(update).toEqual({ ok: true, input: { full_name: "Ana", bio: null, username: "ana_2" } })
  })

  it("recusa username inválido e nome vazio", () => {
    expect(buildProfileUpdate({ fullName: "Ana", username: "a!", bio: "" }, "ana").ok).toBe(false)
    expect(buildProfileUpdate({ fullName: "  ", username: "ana", bio: "" }, "ana")).toEqual({ ok: false, error: "Informe seu nome." })
  })
})
