import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useTransientFlag, useTransientValue } from "./use-transient-value"

describe("useTransientValue", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("mostra o valor e volta a null depois do prazo", () => {
    const { result } = renderHook(() => useTransientValue<string>(1_000))
    act(() => result.current.show("Salvo"))
    expect(result.current.value).toBe("Salvo")
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(result.current.value).toBeNull()
  })

  it("reinicia o prazo quando mostrado de novo", () => {
    const { result } = renderHook(() => useTransientValue<string>(1_000))
    act(() => result.current.show("primeiro"))
    act(() => {
      vi.advanceTimersByTime(800)
    })
    act(() => result.current.show("segundo"))
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(result.current.value).toBe("segundo")
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.value).toBeNull()
  })

  it("clear esconde na hora e cancela o temporizador", () => {
    const { result } = renderHook(() => useTransientValue<number>(1_000))
    act(() => result.current.show(42))
    act(() => result.current.clear())
    expect(result.current.value).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("não deixa temporizador pendente ao desmontar", () => {
    const { result, unmount } = renderHook(() => useTransientValue<number>(1_000))
    act(() => result.current.show(1))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe("useTransientFlag", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("fica ativo só durante o prazo", () => {
    const { result } = renderHook(() => useTransientFlag(500))
    expect(result.current.isActive).toBe(false)
    act(() => result.current.activate())
    expect(result.current.isActive).toBe(true)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current.isActive).toBe(false)
  })
})
