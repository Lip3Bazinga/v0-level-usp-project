import { describe, expect, it } from "vitest"
import { isTrackCertifiable, trackCourseStatus, type CourseStanding } from "./tracks.domain"

const NOTHING: CourseStanding = { enrolled: false, started: false, completed: false, certified: false, prerequisiteCertified: true }

describe("trackCourseStatus", () => {
  it("curso sem atividade e sem trava está disponível", () => {
    expect(trackCourseStatus(NOTHING)).toBe("available")
  })
  it("pré-requisito sem certificado trava o curso", () => {
    expect(trackCourseStatus({ ...NOTHING, prerequisiteCertified: false })).toBe("locked")
    expect(trackCourseStatus({ ...NOTHING, enrolled: true, prerequisiteCertified: false })).toBe("locked")
  })
  it("matrícula ou lição iniciada deixa em andamento", () => {
    expect(trackCourseStatus({ ...NOTHING, enrolled: true })).toBe("in_progress")
    expect(trackCourseStatus({ ...NOTHING, started: true })).toBe("in_progress")
  })
  it("o que já foi conquistado vale mais que a trava", () => {
    expect(trackCourseStatus({ ...NOTHING, enrolled: true, completed: true, prerequisiteCertified: false })).toBe("completed")
    expect(trackCourseStatus({ ...NOTHING, completed: true, certified: true, prerequisiteCertified: false })).toBe("certified")
  })
})

describe("isTrackCertifiable", () => {
  it("exige todos os cursos certificados", () => {
    expect(isTrackCertifiable(["a", "b"], new Set(["a"]))).toBe(false)
    expect(isTrackCertifiable(["a", "b"], new Set(["a", "b", "c"]))).toBe(true)
  })
  it("trilha sem cursos nunca certifica", () => {
    expect(isTrackCertifiable([], new Set(["a"]))).toBe(false)
  })
})
