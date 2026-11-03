import { describe, expect, it } from "vitest"
import type { Profile } from "@levelusp/contracts"
import { countByRole, filterUsers, runForEachUser } from "./user-list"

function profile(overrides: Partial<Profile>): Profile {
  return {
    id: "u", email: "u@usp.br", full_name: "Usuário", username: null, avatar_url: null, bio: null, role: "student",
    level: 1, total_xp: 0, current_streak: 0, max_streak: 0, courses_completed: 0, lessons_completed: 0,
    last_login_date: null, suspended: false, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

const ANA = profile({ id: "ana", full_name: "Ana", email: "ana@usp.br", total_xp: 900, created_at: "2026-01-02T00:00:00Z" })
const BETO = profile({ id: "beto", full_name: "Beto", username: "beto_lima", role: "teacher", total_xp: 300 })
const CAIO = profile({ id: "caio", full_name: "Caio", role: "admin", total_xp: 500, lessons_completed: 7 })

describe("lista de usuários do admin", () => {
  it("busca por nome, e-mail ou username sem diferenciar maiúsculas", () => {
    const query = { role: "all", sort: "xp-desc" } as const
    expect(filterUsers([ANA, BETO, CAIO], { ...query, search: "ANA@" })).toEqual([ANA])
    expect(filterUsers([ANA, BETO, CAIO], { ...query, search: "lima" })).toEqual([BETO])
  })

  it("filtra por papel e ordena", () => {
    expect(filterUsers([ANA, BETO, CAIO], { search: "", role: "teacher", sort: "name" })).toEqual([BETO])
    expect(filterUsers([BETO, CAIO, ANA], { search: "", role: "all", sort: "xp-asc" }).map((user) => user.id)).toEqual(["beto", "caio", "ana"])
    expect(filterUsers([ANA, BETO, CAIO], { search: "", role: "all", sort: "lessons" })[0]).toBe(CAIO)
    expect(filterUsers([BETO, ANA], { search: "", role: "all", sort: "recent" })[0]).toBe(ANA)
  })

  it("conta usuários por papel", () => {
    expect(countByRole([ANA, BETO, CAIO])).toEqual({ all: 3, student: 1, teacher: 1, admin: 1 })
  })

  it("separa sucessos e falhas da ação em massa", async () => {
    const outcome = await runForEachUser(["ana", "beto"], (userId) =>
      userId === "beto" ? Promise.reject(new Error("recusado")) : Promise.resolve(ANA),
    )
    expect(outcome.updated).toEqual([ANA])
    expect(outcome.failedCount).toBe(1)
    expect(outcome.firstError).toBeInstanceOf(Error)
  })
})
