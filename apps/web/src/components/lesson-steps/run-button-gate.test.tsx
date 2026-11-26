import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RUN_BUTTON_MIN_LEVEL, type Profile } from "@levelusp/contracts"
import { RunButtonGateProvider, runButtonLockMessage, useProvidedRunButtonGate, useRunButtonGate, type RunButtonGate } from "./run-button-gate"

const auth: { profile: Partial<Profile> | null; isLoading: boolean } = { profile: null, isLoading: false }
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => auth }))

const student = (level: number, extra: Partial<Profile> = {}): Partial<Profile> => ({ id: "u1", role: "student", level, experiment_condition: null, ...extra })

describe("runButtonLockMessage", () => {
  it("cita o nível e o comando do terminal", () => {
    expect(runButtonLockMessage(10, true)).toBe("Executar libera no nível 10; até lá, use o terminal: python main.py")
  })

  it("não cita o nível para quem não vê a gamificação", () => {
    expect(runButtonLockMessage(10, false)).toBe("Por enquanto, rode seu código pelo terminal: python main.py")
  })
})

describe("useRunButtonGate", () => {
  beforeEach(() => {
    auth.profile = student(1)
    auth.isLoading = false
  })

  it("bloqueia o aluno abaixo do nível padrão e explica o motivo", () => {
    const { result } = renderHook(() => useRunButtonGate(null))
    expect(result.current).toEqual({
      isLocked: true,
      minLevel: RUN_BUTTON_MIN_LEVEL,
      message: `Executar libera no nível ${RUN_BUTTON_MIN_LEVEL}; até lá, use o terminal: python main.py`,
    })
  })

  it("usa o limite do curso e libera quando o nível do contexto muda, sem remontar", () => {
    auth.profile = student(3)
    const { result, rerender } = renderHook(() => useRunButtonGate(4))
    expect(result.current.isLocked).toBe(true)
    expect(result.current.message).toContain("nível 4")
    auth.profile = student(4)
    rerender()
    expect(result.current).toEqual({ isLocked: false, minLevel: 4, message: null })
  })

  it("limite 1 deixa sempre liberado, inclusive para visitante sem sessão", () => {
    auth.profile = null
    expect(renderHook(() => useRunButtonGate(1)).result.current.isLocked).toBe(false)
    expect(renderHook(() => useRunButtonGate(null)).result.current.isLocked).toBe(true)
  })

  it("professor e admin nunca ficam bloqueados", () => {
    auth.profile = student(1, { role: "teacher" })
    expect(renderHook(() => useRunButtonGate(null)).result.current.isLocked).toBe(false)
    auth.profile = student(1, { role: "admin" })
    expect(renderHook(() => useRunButtonGate(50)).result.current.isLocked).toBe(false)
  })

  it("não bloqueia enquanto a sessão carrega", () => {
    auth.profile = null
    auth.isLoading = true
    expect(renderHook(() => useRunButtonGate(null)).result.current.isLocked).toBe(false)
  })

  it("grupo controle: bloqueia igual, mas a mensagem não cita o nível", () => {
    auth.profile = student(1, { experiment_condition: "controle" })
    const { result } = renderHook(() => useRunButtonGate(null))
    expect(result.current.isLocked).toBe(true)
    expect(result.current.message).toBe("Por enquanto, rode seu código pelo terminal: python main.py")
  })
})

describe("useProvidedRunButtonGate", () => {
  it("sem provedor (prévia do professor), o Executar está liberado", () => {
    expect(renderHook(() => useProvidedRunButtonGate()).result.current).toEqual({ isLocked: false, minLevel: RUN_BUTTON_MIN_LEVEL, message: null })
  })

  it("com provedor, entrega a situação calculada pelo player", () => {
    const gate: RunButtonGate = { isLocked: true, minLevel: 4, message: "bloqueado" }
    const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => <RunButtonGateProvider gate={gate}>{children}</RunButtonGateProvider>
    expect(renderHook(() => useProvidedRunButtonGate(), { wrapper }).result.current).toBe(gate)
  })
})
