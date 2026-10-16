import { describe, expect, it } from "vitest"
import { sanitizeRichContent } from "./rich-content"

describe("sanitizeRichContent", () => {
  it("remove scripts e atributos de evento (XSS armazenado)", () => {
    const out = sanitizeRichContent('<p>Oi</p><img src=x onerror="alert(1)"><script>fetch("/api")</script>')
    expect(out).not.toMatch(/onerror|<script|fetch/)
    expect(out).toContain("<p>Oi</p>")
  })

  it("remove links javascript:", () => {
    expect(sanitizeRichContent('<p><a href="javascript:alert(1)">x</a></p>')).not.toContain("javascript:")
  })

  it("mantém a formatação do editor", () => {
    const html = "<h2>Título</h2><pre><code class=\"language-python\">print(1 &lt; 2)</code></pre><ul><li>item</li></ul>"
    expect(sanitizeRichContent(html)).toBe(html)
  })

  it("não altera Markdown (inclusive com < em código)", () => {
    const md = "# Comparações\n\n```python\nprint(1 < 2)\n```"
    expect(sanitizeRichContent(md)).toBe(md)
  })
})
