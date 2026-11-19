import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { STORAGE_KEYS } from "@/lib/constants/storage"
import {
  clampPreviewWidth, PREVIEW_WIDTH_DEFAULT, PREVIEW_WIDTH_MAX, PREVIEW_WIDTH_MIN, readPreviewHidden, readPreviewWidth, writePreviewHidden, writePreviewWidth,
} from "./preview-layout"

describe("layout da prévia", () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it("limita a largura entre 30 e 70 e trata valores inválidos", () => {
    expect(clampPreviewWidth(10)).toBe(PREVIEW_WIDTH_MIN)
    expect(clampPreviewWidth(95)).toBe(PREVIEW_WIDTH_MAX)
    expect(clampPreviewWidth(42)).toBe(42)
    expect(clampPreviewWidth(Number.NaN)).toBe(PREVIEW_WIDTH_DEFAULT)
    expect(PREVIEW_WIDTH_DEFAULT).toBe(50)
  })

  it("grava e lê a preferência de esconder", () => {
    expect(readPreviewHidden()).toBe(false)
    writePreviewHidden(true)
    expect(window.localStorage.getItem(STORAGE_KEYS.lessonPreviewHidden)).toBe("true")
    expect(readPreviewHidden()).toBe(true)
    writePreviewHidden(false)
    expect(readPreviewHidden()).toBe(false)
  })

  it("grava a largura limitada e lê o padrão quando falta ou está corrompida", () => {
    expect(readPreviewWidth()).toBe(PREVIEW_WIDTH_DEFAULT)
    writePreviewWidth(120)
    expect(readPreviewWidth()).toBe(PREVIEW_WIDTH_MAX)
    writePreviewWidth(35)
    expect(readPreviewWidth()).toBe(35)
    window.localStorage.setItem(STORAGE_KEYS.lessonPreviewWidth, "lixo")
    expect(readPreviewWidth()).toBe(PREVIEW_WIDTH_DEFAULT)
  })

  it("não quebra com o localStorage bloqueado", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado")
    })
    expect(readPreviewHidden()).toBe(false)
    expect(readPreviewWidth()).toBe(PREVIEW_WIDTH_DEFAULT)
    expect(() => writePreviewHidden(true)).not.toThrow()
    expect(() => writePreviewWidth(40)).not.toThrow()
  })
})
