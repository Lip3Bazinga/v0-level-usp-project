import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as api from "@/lib/api"
import ProvaPage from "./page"

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "curso-1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ profile: { id: "u1", full_name: "Aluna" }, isLoading: false }),
}))

vi.mock("@/lib/api", () => ({
  fetchExamStatus: vi.fn(),
  startExam: vi.fn(),
  submitExam: vi.fn(),
  issueCertificate: vi.fn(),
}))

const status = {
  exam: { title: "Prova final", description: "", passingScore: 70, timeLimitMinutes: 20, cooldownMinutes: 10, questionCount: 2 },
  eligible: true, lessonsRemaining: 0, lessonsTotal: 21, attemptsCount: 0, bestScore: null, passed: false,
  passedScore: null, cooldownUntil: null, inProgressAttemptId: null, inProgressExpiresAt: null,
}

function examStart(expiresInMs: number) {
  return {
    attemptId: "tentativa-1",
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    resumed: false,
    questions: [
      { id: "q1", prompt: "Tipo de 3 / 2?", options: ["int", "float"] },
      { id: "q2", prompt: "Bloco que sempre executa?", options: ["except", "finally"] },
    ],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchExamStatus).mockResolvedValue({ ok: true, data: status } as never)
  vi.mocked(api.submitExam).mockResolvedValue({
    ok: true,
    data: { score: 100, passed: true, correctCount: 2, total: 2, passingScore: 70, review: [] },
  } as never)
})

describe("prova final", () => {
  it("o envio automático no fim do tempo leva as respostas marcadas (regressão: ia vazio)", async () => {
    vi.mocked(api.startExam).mockResolvedValue({ ok: true, data: examStart(1500) } as never)
    const user = userEvent.setup()
    render(<ProvaPage />)

    await user.click(await screen.findByRole("button", { name: /Começar a prova/ }))
    await user.click(await screen.findByLabelText("float"))
    await user.click(screen.getByLabelText("finally"))

    await waitFor(() => expect(api.submitExam).toHaveBeenCalledTimes(1), { timeout: 5000 })
    expect(api.submitExam).toHaveBeenCalledWith("curso-1", "tentativa-1", { q1: 1, q2: 1 })
  })

  it("entregar com questões em branco pede confirmação", async () => {
    vi.mocked(api.startExam).mockResolvedValue({ ok: true, data: examStart(10 * 60_000) } as never)
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    const user = userEvent.setup()
    render(<ProvaPage />)

    await user.click(await screen.findByRole("button", { name: /Começar a prova/ }))
    await user.click(await screen.findByLabelText("float"))
    await user.click(screen.getByRole("button", { name: /Entregar prova/ }))

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("1 questão sem resposta"))
    expect(api.submitExam).not.toHaveBeenCalled()
    // As questões são grupos de rádio com o enunciado como nome acessível.
    expect(screen.getByRole("radiogroup", { name: /Tipo de 3 \/ 2/ })).toBeInTheDocument()
  })
})
