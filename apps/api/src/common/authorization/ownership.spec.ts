import { describe, expect, it } from "vitest"
import { canManage, canView, canViewContent, ownerScope } from "./ownership"

const teacher = { id: "t1", role: "teacher" as const }
const admin = { id: "a1", role: "admin" as const }
const student = { id: "s1", role: "student" as const }

describe("canManage / canView", () => {
  it("dono e admin gerenciam; outros não", () => {
    expect(canManage(teacher, "t1")).toBe(true)
    expect(canManage(admin, "t1")).toBe(true)
    expect(canManage(student, "t1")).toBe(false)
    expect(canManage(undefined, "t1")).toBe(false)
  })
  it("recurso sem dono só é gerenciável por admin", () => {
    expect(canManage(teacher, null)).toBe(false)
    expect(canManage(admin, null)).toBe(true)
  })
  it("rascunho é invisível para quem não é dono", () => {
    expect(canView(undefined, true, "t1")).toBe(true)
    expect(canView(student, false, "t1")).toBe(false)
    expect(canView(undefined, false, "t1")).toBe(false)
    expect(canView(teacher, false, "t1")).toBe(true)
    expect(canViewContent(student, { published: false, createdBy: null })).toBe(false)
  })
})

describe("ownerScope", () => {
  it("admin lista tudo; professor só o próprio conteúdo", () => {
    expect(ownerScope(admin)).toBeNull()
    expect(ownerScope(teacher)).toBe("t1")
  })
})
