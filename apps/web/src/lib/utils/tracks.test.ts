import { describe, expect, it } from "vitest"
import type { TrackCourse, TrackCourseStatus } from "@levelusp/contracts"
import { prerequisiteTitle, summarizeTrack } from "./tracks"

function course(id: string, status: TrackCourseStatus, prerequisite: string | null = null): TrackCourse {
  return {
    id, title: `Curso ${id}`, description: "", long_description: "", cover_image_url: null, level: "iniciante", tags: [], total_xp: 0, estimated_hours: 50,
    published: true, created_by: null, created_at: "", updated_at: "", final_project_title: null, final_project_description: null,
    final_project_starter_code: null, slug: id, prerequisite_course_id: prerequisite, sequential: false, position: 1, student_status: status,
  }
}

describe("summarizeTrack", () => {
  it("conta os certificados e aponta onde continuar", () => {
    const summary = summarizeTrack([course("n1", "certified"), course("n2", "in_progress", "n1"), course("n3", "locked", "n2")])
    expect(summary).toMatchObject({ total: 3, certified: 1, percent: 33, isCertifiable: false })
    expect(summary.nextCourse?.id).toBe("n2")
  })
  it("só é certificável com todos os cursos certificados; trilha vazia nunca", () => {
    expect(summarizeTrack([course("n1", "certified"), course("n2", "certified")])).toMatchObject({ isCertifiable: true, percent: 100, nextCourse: null })
    expect(summarizeTrack([])).toMatchObject({ isCertifiable: false, percent: 0, nextCourse: null })
  })
  it("não manda o aluno para um curso bloqueado", () => {
    expect(summarizeTrack([course("n1", "locked", "x")]).nextCourse).toBeNull()
  })
})

describe("prerequisiteTitle", () => {
  it("acha o pré-requisito dentro da trilha", () => {
    const first = course("n1", "available")
    const second = course("n2", "locked", "n1")
    expect(prerequisiteTitle(second, [first, second])).toBe("Curso n1")
    expect(prerequisiteTitle(first, [first, second])).toBeNull()
  })
})
