import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useSubmitLock } from "./use-submit-lock"

describe("useSubmitLock", () => {
  it("recusa o segundo envio enquanto o primeiro não termina", () => {
    const { result } = renderHook(() => useSubmitLock())
    let first = false
    let second = true
    act(() => {
      first = result.current.acquire()
      second = result.current.acquire()
    })
    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(result.current.isSubmitting).toBe(true)
  })

  it("libera para um novo envio depois de release", () => {
    const { result } = renderHook(() => useSubmitLock())
    act(() => {
      result.current.acquire()
      result.current.release()
    })
    expect(result.current.isSubmitting).toBe(false)
    let again = false
    act(() => {
      again = result.current.acquire()
    })
    expect(again).toBe(true)
  })
})
