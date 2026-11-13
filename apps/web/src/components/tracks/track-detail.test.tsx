import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TrackCourse, TrackCourseStatus, TrackWithCourses } from "@levelusp/contracts"
import * as api from "@/lib/api"
import type * as LibApi from "@/lib/api"
import { TrackDetail } from "./track-detail"

let profile: { id: string } | null = { id: "u1" }
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ profile }) }))
vi.mock("@/lib/swal", () => ({ swalToast: vi.fn() }))
vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<typeof LibApi>()), fetchTrack: vi.fn(), issueTrackCertificate: vi.fn() }))

function course(id: string, position: number, status: TrackCourseStatus, prerequisite: string | null = null): TrackCourse {
  return {
    id, title: `Nível ${position}`, description: `Descrição ${position}`, long_description: "", cover_image_url: null, level: "iniciante", tags: [], total_xp: 0,
    estimated_hours: 50, published: true, created_by: null, created_at: "", updated_at: "", final_project_title: null, final_project_description: null,
    final_project_starter_code: null, slug: id, prerequisite_course_id: prerequisite, sequential: false, lesson_count: 47, position, student_status: status,
  }
}

function track(courses: TrackCourse[]): TrackWithCourses {
  return {
    id: "t1", slug: "python-do-zero-a-ia", title: "Python: do zero à IA", description: "Sete níveis.", icon: "Route", color: "", sort_order: 0, published: true,
    certificate_title: "Python: do zero à IA", created_at: "", updated_at: "", courses,
  }
}

describe("página da trilha", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profile = { id: "u1" }
  })

  it("mostra os cursos na ordem com a situação do aluno e trava o que depende de certificado", async () => {
    vi.mocked(api.fetchTrack).mockResolvedValue(track([course("n1", 1, "certified"), course("n2", 2, "in_progress", "n1"), course("n3", 3, "locked", "n2")]))
    render(<TrackDetail slug="python-do-zero-a-ia" />)
    const items = within(await screen.findByRole("list", { name: "Cursos da trilha" })).getAllByRole("listitem")
    expect(items).toHaveLength(3)
    expect(within(items[0] as HTMLElement).getByRole("link", { name: /Rever o curso/ })).toHaveAttribute("href", "/cursos/n1")
    expect(within(items[1] as HTMLElement).getByRole("link", { name: /Continuar/ })).toHaveAttribute("href", "/cursos/n2")
    expect(within(items[2] as HTMLElement).queryByRole("link")).toBeNull()
    expect(within(items[2] as HTMLElement).getByText("Libera com o certificado de Nível 2.")).toBeInTheDocument()
    expect(screen.getByText("1 de 3 cursos certificados")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Emitir certificado/ })).toBeNull()
  })

  it("com todos os cursos certificados, emite o certificado da trilha pela API", async () => {
    vi.mocked(api.fetchTrack).mockResolvedValue(track([course("n1", 1, "certified")]))
    vi.mocked(api.issueTrackCertificate).mockResolvedValue({ issued: true, already_issued: false, verification_code: "TRL-AAAA-BBBB", issued_at: "" })
    render(<TrackDetail slug="python-do-zero-a-ia" />)
    await userEvent.click(await screen.findByRole("button", { name: "Emitir certificado da trilha" }))
    expect(api.issueTrackCertificate).toHaveBeenCalledWith("t1")
    expect(await screen.findByRole("link", { name: /TRL-AAAA-BBBB/ })).toHaveAttribute("href", "/certificado/TRL-AAAA-BBBB")
  })

  it("visitante vê a trilha e o convite para entrar; trilha inexistente tem mensagem própria", async () => {
    profile = null
    vi.mocked(api.fetchTrack).mockResolvedValueOnce(track([course("n1", 1, "available")]))
    const { unmount } = render(<TrackDetail slug="python-do-zero-a-ia" />)
    expect(await screen.findByRole("link", { name: "Entrar para acompanhar" })).toHaveAttribute("href", "/login?next=%2Ftrilhas%2Fpython-do-zero-a-ia")
    expect(screen.queryByText(/cursos certificados/)).toBeNull()
    unmount()

    vi.mocked(api.fetchTrack).mockResolvedValueOnce(null)
    render(<TrackDetail slug="nao-existe" />)
    expect(await screen.findByRole("heading", { name: "Trilha não encontrada" })).toBeInTheDocument()
  })
})
