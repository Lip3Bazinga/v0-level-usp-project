import { describe, expect, it } from "vitest"
import { codeBlockKind, parseVideoEmbedUrl } from "./rich-markdown"

describe("vídeo incorporado", () => {
  it("aceita só o YouTube sem cookies e o Vimeo, no formato de incorporação", () => {
    expect(parseVideoEmbedUrl("https://www.youtube-nocookie.com/embed/AAAAAAAAAAA")).toEqual({ provider: "youtube", url: "https://www.youtube-nocookie.com/embed/AAAAAAAAAAA" })
    expect(parseVideoEmbedUrl("https://player.vimeo.com/video/123456789")).toEqual({ provider: "vimeo", url: "https://player.vimeo.com/video/123456789" })
  })

  it.each([
    "https://www.youtube.com/watch?v=AAAAAAAAAAA",
    "https://www.youtube.com/embed/AAAAAAAAAAA",
    "http://www.youtube-nocookie.com/embed/AAAAAAAAAAA",
    "https://www.youtube-nocookie.com.evil.example/embed/AAAAAAAAAAA",
    "https://evil.example/https://www.youtube-nocookie.com/embed/AAAAAAAAAAA",
    "https://user@www.youtube-nocookie.com/embed/AAAAAAAAAAA",
    "https://www.youtube-nocookie.com:8443/embed/AAAAAAAAAAA",
    "https://www.youtube-nocookie.com/embed/AAAAAAAAAAA?autoplay=1",
    "https://www.youtube-nocookie.com/embed/AAAAAAAAAAA#t=1",
    "https://www.youtube-nocookie.com/embed/../watch",
    "https://player.vimeo.com/video/abc",
    "https://player.vimeo.com/123",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "//www.youtube-nocookie.com/embed/AAAAAAAAAAA",
    "",
  ])("recusa %s", (url) => {
    expect(parseVideoEmbedUrl(url)).toBeNull()
  })
})

describe("blocos de código", () => {
  it("reconhece o diagrama, o visualizador e o código comum", () => {
    expect(codeBlockKind("mermaid", null)).toBe("mermaid")
    expect(codeBlockKind("python", "visualizar")).toBe("visualizer")
    expect(codeBlockKind("py", 'name="x" visualizar')).toBe("visualizer")
    expect(codeBlockKind("python", null)).toBe("plain")
    expect(codeBlockKind("python", "visualizarTudo")).toBe("plain")
    expect(codeBlockKind("text", "visualizar")).toBe("plain")
    expect(codeBlockKind(null, null)).toBe("plain")
  })
})
