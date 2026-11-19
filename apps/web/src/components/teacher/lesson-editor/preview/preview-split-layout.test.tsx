import { useState } from "react"
import { act, fireEvent, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { STORAGE_KEYS } from "@/lib/constants/storage"
import { PreviewSplitLayout } from "./preview-split-layout"

type ChangeListener = () => void

let matches = true
const listeners = new Set<ChangeListener>()

function setViewport(isWide: boolean): void {
  matches = isWide
  act(() => listeners.forEach((listener) => listener()))
}

function Preview(): React.JSX.Element {
  return <p>Conteúdo da prévia</p>
}

function Editor(): React.JSX.Element {
  const [text, setText] = useState("")
  return <textarea aria-label="Campo do editor" value={text} onChange={(event) => setText(event.target.value)} />
}

function renderLayout(): void {
  render(<PreviewSplitLayout editor={<Editor />} preview={<Preview />} />)
}

describe("PreviewSplitLayout", () => {
  beforeEach(() => {
    matches = true
    listeners.clear()
    window.localStorage.clear()
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
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe("a partir de 1280 px", () => {
    it("mostra editor e prévia lado a lado, com o divisor e sem tela cheia", () => {
      renderLayout()
      expect(screen.getByLabelText("Campo do editor")).toBeInTheDocument()
      expect(within(screen.getByRole("region", { name: "Prévia da aula" })).getByText("Conteúdo da prévia")).toBeInTheDocument()
      expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "vertical")
      expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "50")
      expect(screen.queryByRole("button", { name: "Pré-visualizar" })).toBeNull()
      expect(screen.queryByRole("dialog")).toBeNull()
    })

    it("esconde e mostra a prévia, e lembra a preferência", async () => {
      renderLayout()
      await userEvent.click(screen.getByRole("button", { name: "Esconder prévia" }))
      expect(screen.queryByText("Conteúdo da prévia")).toBeNull()
      expect(screen.queryByRole("separator")).toBeNull()
      expect(window.localStorage.getItem(STORAGE_KEYS.lessonPreviewHidden)).toBe("true")

      await userEvent.click(screen.getByRole("button", { name: "Mostrar prévia" }))
      expect(screen.getByText("Conteúdo da prévia")).toBeInTheDocument()
      expect(window.localStorage.getItem(STORAGE_KEYS.lessonPreviewHidden)).toBe("false")
    })

    it("começa escondida quando a preferência salva é essa", () => {
      window.localStorage.setItem(STORAGE_KEYS.lessonPreviewHidden, "true")
      renderLayout()
      expect(screen.queryByText("Conteúdo da prévia")).toBeNull()
      expect(screen.getByRole("button", { name: "Mostrar prévia" })).toBeInTheDocument()
    })

    it("o divisor responde ao teclado (setas, Home e End) e persiste a largura", () => {
      renderLayout()
      const separator = screen.getByRole("separator")
      fireEvent.keyDown(separator, { key: "ArrowRight" })
      expect(separator).toHaveAttribute("aria-valuenow", "55")
      fireEvent.keyDown(separator, { key: "ArrowLeft" })
      fireEvent.keyDown(separator, { key: "ArrowLeft" })
      expect(separator).toHaveAttribute("aria-valuenow", "45")
      expect(window.localStorage.getItem(STORAGE_KEYS.lessonPreviewWidth)).toBe("45")
      fireEvent.keyDown(separator, { key: "End" })
      expect(separator).toHaveAttribute("aria-valuenow", "70")
      fireEvent.keyDown(separator, { key: "ArrowRight" })
      expect(separator).toHaveAttribute("aria-valuenow", "70")
      fireEvent.keyDown(separator, { key: "Home" })
      expect(separator).toHaveAttribute("aria-valuenow", "30")
      fireEvent.keyDown(separator, { key: "ArrowLeft" })
      expect(separator).toHaveAttribute("aria-valuenow", "30")
    })

    it("lê a largura salva ao montar", () => {
      window.localStorage.setItem(STORAGE_KEYS.lessonPreviewWidth, "60")
      renderLayout()
      expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "60")
    })

    it("arrastar o divisor com o ponteiro muda a largura dentro dos limites e salva ao soltar", () => {
      renderLayout()
      const separator = screen.getByRole("separator")
      const row = separator.parentElement
      if (!row) throw new Error("linha do layout não encontrada")
      vi.spyOn(row, "getBoundingClientRect").mockReturnValue({ left: 0, width: 1000, right: 1000, top: 0, bottom: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) })
      separator.setPointerCapture = vi.fn()
      separator.releasePointerCapture = vi.fn()
      separator.hasPointerCapture = vi.fn(() => true)

      fireEvent.pointerDown(separator, { pointerId: 1, clientX: 500 })
      expect(separator.setPointerCapture).toHaveBeenCalledWith(1)
      fireEvent.pointerMove(separator, { pointerId: 1, clientX: 620 })
      expect(separator).toHaveAttribute("aria-valuenow", "62")
      fireEvent.pointerMove(separator, { pointerId: 1, clientX: 950 })
      expect(separator).toHaveAttribute("aria-valuenow", "70")
      expect(window.localStorage.getItem(STORAGE_KEYS.lessonPreviewWidth)).toBeNull()
      fireEvent.pointerUp(separator, { pointerId: 1 })
      expect(window.localStorage.getItem(STORAGE_KEYS.lessonPreviewWidth)).toBe("70")
      // Depois de soltar, mover o ponteiro não faz mais nada.
      fireEvent.pointerMove(separator, { pointerId: 1, clientX: 400 })
      expect(separator).toHaveAttribute("aria-valuenow", "70")
    })
  })

  describe("abaixo de 1280 px", () => {
    beforeEach(() => {
      matches = false
    })

    it("mostra só o editor e o botão Pré-visualizar", () => {
      renderLayout()
      expect(screen.getByLabelText("Campo do editor")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Pré-visualizar" })).toBeInTheDocument()
      expect(screen.queryByText("Conteúdo da prévia")).toBeNull()
      expect(screen.queryByRole("separator")).toBeNull()
      expect(screen.queryByRole("button", { name: "Esconder prévia" })).toBeNull()
    })

    it("abre a prévia em tela cheia como diálogo modal e volta ao editor", async () => {
      renderLayout()
      const opener = screen.getByRole("button", { name: "Pré-visualizar" })
      await userEvent.click(opener)

      const dialog = screen.getByRole("dialog", { name: "Prévia da aula" })
      expect(dialog).toHaveAttribute("aria-modal", "true")
      expect(within(dialog).getByText("Conteúdo da prévia")).toBeInTheDocument()

      await userEvent.click(within(dialog).getByRole("button", { name: "Voltar ao editor" }))
      expect(screen.queryByRole("dialog")).toBeNull()
      expect(screen.queryByText("Conteúdo da prévia")).toBeNull()
    })

    it("Esc fecha a tela cheia", async () => {
      renderLayout()
      await userEvent.click(screen.getByRole("button", { name: "Pré-visualizar" }))
      expect(screen.getByRole("dialog")).toBeInTheDocument()
      await userEvent.keyboard("{Escape}")
      expect(screen.queryByRole("dialog")).toBeNull()
    })

    it("não duplica a árvore da prévia: só há um conteúdo por vez", async () => {
      renderLayout()
      await userEvent.click(screen.getByRole("button", { name: "Pré-visualizar" }))
      expect(screen.getAllByText("Conteúdo da prévia")).toHaveLength(1)
    })
  })

  it("troca de layout quando a largura da janela muda, sem perder o texto do editor", async () => {
    renderLayout()
    await userEvent.type(screen.getByLabelText("Campo do editor"), "abc")
    expect(screen.getByRole("separator")).toBeInTheDocument()

    setViewport(false)
    expect(screen.queryByRole("separator")).toBeNull()
    expect(screen.getByRole("button", { name: "Pré-visualizar" })).toBeInTheDocument()
    expect(screen.getByLabelText("Campo do editor")).toHaveValue("abc")

    await userEvent.click(screen.getByRole("button", { name: "Pré-visualizar" }))
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    setViewport(true)
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByRole("separator")).toBeInTheDocument()
    expect(screen.getAllByText("Conteúdo da prévia")).toHaveLength(1)
    expect(screen.getByLabelText("Campo do editor")).toHaveValue("abc")

    // Estreitar de novo não reabre a tela cheia sozinha.
    setViewport(false)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("não quebra com o localStorage bloqueado", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado")
    })
    renderLayout()
    await userEvent.click(screen.getByRole("button", { name: "Esconder prévia" }))
    expect(screen.queryByText("Conteúdo da prévia")).toBeNull()
  })
})
