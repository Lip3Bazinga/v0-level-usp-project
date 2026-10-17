import { describe, expect, it } from "vitest"
import { closeTab, createEditorTabs, openTab, renameTabs } from "./editor-tabs"

describe("abas do editor", () => {
  it("abrir uma aba já aberta só muda o foco", () => {
    const tabs = openTab(openTab(createEditorTabs(), "a.py"), "main.py")
    expect(tabs).toEqual({ openPaths: ["main.py", "a.py"], activePath: "main.py" })
  })

  it("fechar a aba ativa foca a última restante e nunca deixa o editor sem abas", () => {
    const tabs = openTab(openTab(createEditorTabs(), "a.py"), "b.py")
    expect(closeTab(tabs, "b.py")).toEqual({ openPaths: ["main.py", "a.py"], activePath: "a.py" })
    expect(closeTab(createEditorTabs(), "main.py")).toEqual({ openPaths: ["main.py"], activePath: "main.py" })
  })

  it("renomear uma pasta atualiza as abas dos arquivos dentro dela", () => {
    const tabs = openTab(createEditorTabs(), "utils/a.py")
    expect(renameTabs(tabs, "utils", "lib")).toEqual({ openPaths: ["main.py", "lib/a.py"], activePath: "lib/a.py" })
  })
})
