import { act, renderHook } from "@testing-library/react"
import { renderToString } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useMediaQuery } from "./use-media-query"

type ChangeListener = () => void

function mockMatchMedia(initial: boolean): { setMatches: (next: boolean) => void } {
  let matches = initial
  const listeners = new Set<ChangeListener>()
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return matches
      },
      addEventListener: (_type: string, listener: ChangeListener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: ChangeListener) => listeners.delete(listener),
    })),
  )
  return {
    setMatches: (next) => {
      matches = next
      listeners.forEach((listener) => listener())
    },
  }
}

function Probe(): React.JSX.Element {
  return <span>{String(useMediaQuery("(min-width: 1280px)"))}</span>
}

describe("useMediaQuery", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("reflete a query atual e acompanha as mudanças", () => {
    const media = mockMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery("(min-width: 1280px)"))
    expect(result.current).toBe(true)
    act(() => media.setMatches(false))
    expect(result.current).toBe(false)
    act(() => media.setMatches(true))
    expect(result.current).toBe(true)
  })

  it("devolve false quando o ambiente não tem matchMedia", () => {
    vi.stubGlobal("matchMedia", undefined)
    const { result } = renderHook(() => useMediaQuery("(min-width: 1280px)"))
    expect(result.current).toBe(false)
  })

  it("renderiza false no servidor mesmo que a query combine", () => {
    mockMatchMedia(true)
    expect(renderToString(<Probe />)).toContain("false")
  })
})
