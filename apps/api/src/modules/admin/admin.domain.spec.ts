import { describe, expect, it } from "vitest"
import { dailySeries, lastDays, percentage, selfActionViolation } from "./admin.domain"

describe("selfActionViolation", () => {
  const me = "11111111-1111-1111-1111-111111111111"
  const other = "22222222-2222-2222-2222-222222222222"

  it("permite qualquer ação sobre outra pessoa", () => {
    expect(selfActionViolation(me, other, { kind: "delete" })).toBeNull()
    expect(selfActionViolation(me, other, { kind: "update", patch: { role: "student", suspended: true } })).toBeNull()
  })
  it("impede o admin de se rebaixar", () => {
    expect(selfActionViolation(me, me, { kind: "update", patch: { role: "teacher" } })).toMatch(/administrador/)
    expect(selfActionViolation(me, me, { kind: "update", patch: { role: "student" } })).not.toBeNull()
  })
  it("impede auto-suspensão e auto-exclusão", () => {
    expect(selfActionViolation(me, me, { kind: "update", patch: { suspended: true } })).toMatch(/suspender/)
    expect(selfActionViolation(me, me, { kind: "delete" })).toMatch(/excluir/)
  })
  it("permite editar o próprio nome, manter o papel de admin e reativar", () => {
    expect(selfActionViolation(me, me, { kind: "update", patch: {} })).toBeNull()
    expect(selfActionViolation(me, me, { kind: "update", patch: { role: "admin", suspended: false } })).toBeNull()
  })
})

describe("séries diárias", () => {
  const now = new Date("2026-10-16T15:00:00Z")

  it("lista os dias do mais antigo a hoje no fuso de São Paulo", () => {
    expect(lastDays(3, now)).toEqual(["2026-10-14", "2026-10-15", "2026-10-16"])
    // 01:00 UTC ainda é o dia anterior em São Paulo
    expect(lastDays(1, new Date("2026-10-16T01:00:00Z"))).toEqual(["2026-10-15"])
  })
  it("preenche os dias sem atividade com zero", () => {
    const s = dailySeries([{ day: "2026-10-16", n: 4 }, { day: "2026-10-14", n: 2 }, { day: "2020-01-01", n: 9 }], 3, now)
    expect(s).toEqual([2, 0, 4])
  })
  it("gera exatamente N posições, atravessando o mês", () => {
    const s = dailySeries([], 30, new Date("2026-03-02T12:00:00Z"))
    expect(s).toHaveLength(30)
    expect(lastDays(3, new Date("2026-03-02T12:00:00Z"))).toEqual(["2026-02-28", "2026-03-01", "2026-03-02"])
  })
})

describe("percentage", () => {
  it("arredonda e trata base zero", () => {
    expect(percentage(1, 3)).toBe(33)
    expect(percentage(0, 0)).toBe(0)
    expect(percentage(5, 4)).toBe(100)
  })
})
