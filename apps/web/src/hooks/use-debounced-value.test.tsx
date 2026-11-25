import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDebouncedValue } from "./use-debounced-value"

describe("useDebouncedValue", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("começa com o valor inicial", () => {
    const { result } = renderHook(() => useDebouncedValue("a", 300))
    expect(result.current).toBe("a")
  })

  it("só atualiza depois do prazo sem novas mudanças", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: "a" } })
    rerender({ value: "b" })
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current).toBe("a")
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe("b")
  })

  it("reinicia o prazo a cada mudança e entrega só o último valor", () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: 1 } })
    rerender({ value: 2 })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    rerender({ value: 3 })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe(1)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe(3)
  })

  it("não deixa temporizador pendente ao desmontar", () => {
    const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: 1 } })
    rerender({ value: 2 })
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
