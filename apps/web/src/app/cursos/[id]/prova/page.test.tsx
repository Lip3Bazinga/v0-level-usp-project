import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ExamResult, ExamStart, ExamStatus } from "@levelusp/contracts"
import * as api from "@/lib/api"
import { swalConfirm } from "@/lib/swal"
import ProvaPage from "./page"
import type * as LibApi from "@/lib/api"

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "curso-1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ profile: { id: "u1", full_name: "Aluna" }, isLoading: false }),
}))

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof LibApi>()),
  fetchExamStatus: vi.fn(),
  startExam: vi.fn(),
  submitExam: vi.fn(),
  issueCertificate: vi.fn(),
}))

vi.mock("@/lib/swal", () => ({ swalConfirm: vi.fn() }))

const fetchExamStatus = vi.mocked(api.fetchExamStatus)
const startExam = vi.mocked(api.startExam)
const submitExam = vi.mocked(api.submitExam)

const status: ExamStatus = {
  exam: { title: "Prova final", description: "", passingScore: 70, timeLimitMinutes: 20, cooldownMinutes: 10, questionCount: 2 },
  eligible: true, lessonsRemaining: 0, lessonsTotal: 21, attemptsCount: 0, bestScore: null, passed: false,
  passedScore: null, cooldownUntil: null, inProgressAttemptId: null, inProgressExpiresAt: null,
}

const passingResult: ExamResult = { score: 100, passed: true, correctCount: 2, total: 2, passingScore: 70, review: [] }

function examStart(expiresInMs: number): ExamStart {
  return {
    attemptId: "tentativa-1",
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    timeLimitMinutes: 20,
    resumed: false,
    questions: [
      { id: "q1", prompt: "Tipo de 3 / 2?", options: ["int", "float"] },
      { id: "q2", prompt: "Bloco que sempre executa?", options: ["except", "finally"] },
    ],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchExamStatus.mockResolvedValue(status)
  submitExam.mockResolvedValue(passingResult)
})

describe("prova final", () => {
  it("o envio automático no fim do tempo leva as respostas marcadas", async () => {
    startExam.mockResolvedValue(examStart(1500))
    const user = userEvent.setup()
    render(<ProvaPage />)

    await user.click(await screen.findByRole("button", { name: /Começar a prova/ }))
    await user.click(await screen.findByLabelText("float"))
    await user.click(screen.getByLabelText("finally"))

    await waitFor(() => expect(submitExam).toHaveBeenCalledTimes(1), { timeout: 5000 })
    expect(submitExam).toHaveBeenCalledWith("curso-1", "tentativa-1", { q1: 1, q2: 1 })
  })

  it("entregar com questões em branco pede confirmação", async () => {
    startExam.mockResolvedValue(examStart(10 * 60_000))
    const confirm = vi.mocked(swalConfirm).mockResolvedValue(false)
    const user = userEvent.setup()
    render(<ProvaPage />)

    await user.click(await screen.findByRole("button", { name: /Começar a prova/ }))
    await user.click(await screen.findByLabelText("float"))
    await user.click(screen.getByRole("button", { name: /Entregar prova/ }))

    await waitFor(() =>
      expect(confirm.mock.lastCall?.[0].text).toContain("1 questão sem resposta"),
    )
    expect(submitExam).not.toHaveBeenCalled()
    expect(screen.getByRole("radiogroup", { name: /Tipo de 3 \/ 2/ })).toBeInTheDocument()
  })
})
