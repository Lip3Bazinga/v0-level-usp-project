import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NOTE_AUTOSAVE_DEBOUNCE_MS } from "@/lib/constants"
import { useNoteAutosave } from "./use-note-autosave"

const { updateNoteMock } = vi.hoisted(() => ({ updateNoteMock: vi.fn() }))

vi.mock("@/lib/api", () => ({ updateNote: updateNoteMock }))

describe("useNoteAutosave", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    updateNoteMock.mockReset().mockResolvedValue(undefined)
  })
  afterEach(() => vi.useRealTimers())

  it("junta título e conteúdo da mesma nota em um único envio", async () => {
    const { result } = renderHook(() => useNoteAutosave())
    act(() => result.current.scheduleSave("nota-a", "title", "Listas"))
    act(() => result.current.scheduleSave("nota-a", "content", "<p>append</p>"))
    await act(() => vi.advanceTimersByTimeAsync(NOTE_AUTOSAVE_DEBOUNCE_MS))
    expect(updateNoteMock).toHaveBeenCalledTimes(1)
    expect(updateNoteMock).toHaveBeenCalledWith("nota-a", { title: "Listas", content: "<p>append</p>" })
  })

  it("salva a nota anterior na hora quando o aluno passa a editar outra", async () => {
    const { result } = renderHook(() => useNoteAutosave())
    act(() => result.current.scheduleSave("nota-a", "content", "texto de A"))
    act(() => result.current.scheduleSave("nota-b", "title", "Nota B"))
    expect(updateNoteMock).toHaveBeenCalledWith("nota-a", { content: "texto de A" })
    await act(() => vi.advanceTimersByTimeAsync(NOTE_AUTOSAVE_DEBOUNCE_MS))
    expect(updateNoteMock).toHaveBeenLastCalledWith("nota-b", { title: "Nota B" })
    expect(updateNoteMock).toHaveBeenCalledTimes(2)
  })
})
