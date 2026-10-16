import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as api from "@/lib/api"
import { ApiError } from "@/lib/api/client"
import { AuthProvider } from "@/contexts/auth-context"
import LoginPage from "./page"

let searchParams = new URLSearchParams()
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  fetchSession: vi.fn().mockResolvedValue(null),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

const signIn = vi.mocked(api.signIn)

function renderLogin() {
  return render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchSession).mockResolvedValue(null)
  searchParams = new URLSearchParams()
})

describe("página de login", () => {
  it("exibe a mensagem de erro devolvida pela API", async () => {
    signIn.mockRejectedValue(new ApiError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos."))
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText("Email"), "ana@usp.br")
    await user.type(screen.getByLabelText("Senha"), "senha-errada1")
    await user.click(screen.getByRole("button", { name: "Entrar" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.")
    expect(signIn).toHaveBeenCalledWith({ email: "ana@usp.br", password: "senha-errada1" })
  })

  it("exibe erro de conexão quando a API está fora do ar", async () => {
    signIn.mockRejectedValue(new ApiError(0, "NETWORK", "Sem conexão com o servidor. Verifique sua internet."))
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText("Email"), "ana@usp.br")
    await user.type(screen.getByLabelText("Senha"), "qualquer123456")
    await user.click(screen.getByRole("button", { name: "Entrar" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão com o servidor")
  })

  it("tem link para recuperar a senha e login social desabilitado", async () => {
    renderLogin()
    expect(screen.getByRole("link", { name: "Esqueci minha senha" })).toHaveAttribute("href", "/esqueci-senha")
    expect(screen.getByRole("button", { name: /Google/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: /GitHub/ })).toBeDisabled()
    await waitFor(() => expect(api.fetchSession).toHaveBeenCalled())
  })
})
