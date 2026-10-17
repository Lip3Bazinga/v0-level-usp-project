import { describe, expect, it } from "vitest"
import { toNewFilePath, toNewFolderPlaceholderPath, toRenamedPath } from "./file-explorer-paths"

describe("caminhos do explorador de arquivos", () => {
  it("novo arquivo ignora espaços e barras iniciais", () => {
    expect(toNewFilePath("  /pasta/util.py ")).toBe("pasta/util.py")
  })

  it("nova pasta vira um arquivo-marcador .gitkeep", () => {
    expect(toNewFolderPlaceholderPath(" /modelos/ ")).toBe("modelos/.gitkeep")
  })

  it("renomear arquivo mantém a pasta-mãe", () => {
    expect(toRenamedPath({ path: "pasta/a.py", type: "file" }, " b.py ")).toBe("pasta/b.py")
    expect(toRenamedPath({ path: "a.py", type: "file" }, "b.py")).toBe("b.py")
  })

  it("renomear pasta descarta barras do novo nome", () => {
    expect(toRenamedPath({ path: "src/antiga", type: "folder" }, "nova/")).toBe("src/nova")
  })
})
