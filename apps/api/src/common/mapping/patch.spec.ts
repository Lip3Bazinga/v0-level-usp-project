import { describe, expect, it } from "vitest"
import { buildPatch, presentFields, type PatchMapping } from "./patch"

interface ProfileInput {
  full_name?: string
  bio?: string | null
}
interface ProfileColumns {
  fullName: string
  bio: string | null
}

const PROFILE_PATCH: PatchMapping<ProfileInput, ProfileColumns> = {
  full_name: (fullName) => ({ fullName: fullName.trim() }),
  bio: (bio) => ({ bio }),
}

describe("buildPatch", () => {
  it("converte só os campos enviados", () => {
    expect(buildPatch({ full_name: " Ana " }, PROFILE_PATCH)).toEqual({ fullName: "Ana" })
    expect(buildPatch({}, PROFILE_PATCH)).toEqual({})
  })

  it("null é um valor enviado (apaga a coluna); undefined é ausência", () => {
    expect(buildPatch({ bio: null, full_name: undefined }, PROFILE_PATCH)).toEqual({ bio: null })
  })

  it("segue a ordem do mapeamento, não a da entrada", () => {
    expect(Object.keys(buildPatch({ bio: "oi", full_name: "Ana" }, PROFILE_PATCH))).toEqual(["fullName", "bio"])
  })
})

describe("presentFields", () => {
  it("ignora campos undefined", () => {
    expect(presentFields({ a: 1, b: undefined, c: null })).toEqual(["a", "c"])
  })
})
