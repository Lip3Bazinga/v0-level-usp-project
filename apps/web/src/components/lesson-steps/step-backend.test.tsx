import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import * as api from "@/lib/api"
import type * as LibApi from "@/lib/api"
import { API_STEP_BACKEND, StepBackendProvider, useStepBackend, type StepBackend } from "./step-backend"

vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<typeof LibApi>()), submitStep: vi.fn(), revealStepSolution: vi.fn() }))

describe("backend dos passos", () => {
  it("sem provedor, o aluno usa a API (comportamento de sempre)", () => {
    const { result } = renderHook(() => useStepBackend())
    expect(result.current).toBe(API_STEP_BACKEND)
    expect(result.current.isPreview).toBe(false)
    expect(result.current.submitStep).toBe(api.submitStep)
    expect(result.current.revealStepSolution).toBe(api.revealStepSolution)
  })

  it("o provedor troca o backend dos filhos", () => {
    const backend: StepBackend = { ...API_STEP_BACKEND, isPreview: true }
    const { result } = renderHook(() => useStepBackend(), { wrapper: ({ children }) => <StepBackendProvider backend={backend}>{children}</StepBackendProvider> })
    expect(result.current.isPreview).toBe(true)
  })
})
