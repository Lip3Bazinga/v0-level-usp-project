import { describe, expect, it } from "vitest"
import { sanitizeLessonHtml } from "./sanitize"

describe("sanitizeLessonHtml", () => {
  it("remove handlers de evento e scripts", () => {
    const out = sanitizeLessonHtml('<p>ok</p><img src="x" onerror="alert(1)"><script>alert(2)</script>')
    expect(out).toContain("<p>ok</p>")
    expect(out).not.toMatch(/onerror|script/)
  })
})
