import { MAIN_FILE_PATH } from "@/lib/constants"
import { renamePath } from "./project-files"

/** Abas abertas no editor da IDE e a aba em foco. Sempre há ao menos uma aba. */
export interface EditorTabs {
  openPaths: string[]
  activePath: string
}

export function createEditorTabs(path: string = MAIN_FILE_PATH): EditorTabs {
  return { openPaths: [path], activePath: path }
}

export function openTab(tabs: EditorTabs, path: string): EditorTabs {
  const openPaths = tabs.openPaths.includes(path) ? tabs.openPaths : [...tabs.openPaths, path]
  return { openPaths, activePath: path }
}

/** Fecha a aba; se era a ativa, o foco vai para a última aba que sobrou (ou main.py). */
export function closeTab(tabs: EditorTabs, path: string): EditorTabs {
  const remaining = tabs.openPaths.filter((openPath) => openPath !== path)
  const activePath = tabs.activePath === path ? (remaining[remaining.length - 1] ?? MAIN_FILE_PATH) : tabs.activePath
  return { openPaths: remaining.length ? remaining : [MAIN_FILE_PATH], activePath }
}

export function renameTabs(tabs: EditorTabs, oldPath: string, newPath: string): EditorTabs {
  return {
    openPaths: tabs.openPaths.map((path) => renamePath(path, oldPath, newPath)),
    activePath: renamePath(tabs.activePath, oldPath, newPath),
  }
}
