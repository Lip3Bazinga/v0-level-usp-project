"use client"

import { useState, type ReactNode } from "react"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { BookOpen, Code2, Terminal, FolderTree, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResponsiveWorkspaceProps {
  lessonPanel: ReactNode
  editor: ReactNode
  console: ReactNode
  fileExplorer: ReactNode
}

type MobileTab = "lesson" | "editor" | "console" | "files"

const TABS: readonly { id: MobileTab; label: string; icon: LucideIcon }[] = [
  { id: "lesson", label: "Aprender", icon: BookOpen },
  { id: "editor", label: "Código", icon: Code2 },
  { id: "console", label: "Console", icon: Terminal },
  { id: "files", label: "Arquivos", icon: FolderTree },
]

/**
 * Workspace da IDE responsivo.
 * - Desktop (lg+): 3 painéis redimensionáveis lado a lado (teoria | editor+console | arquivos).
 * - Mobile/tablet: navegação por abas na base, um painel por vez em tela cheia.
 */
export function ResponsiveWorkspace({
  lessonPanel,
  editor,
  console: consolePanel,
  fileExplorer,
}: ResponsiveWorkspaceProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<MobileTab>("lesson")

  return (
    <>
      <div className="hidden h-full lg:block">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={28} minSize={22} maxSize={42}>
            {lessonPanel}
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={52} minSize={38}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={65} minSize={30}>
                {editor}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={35} minSize={20} maxSize={55}>
                {consolePanel}
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={20} minSize={15} maxSize={28}>
            {fileExplorer}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <div className="flex h-full flex-col lg:hidden">
        {/* Os quatro painéis ficam montados (o editor não perde o estado); só a visibilidade muda. */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className={activeTab === "lesson" ? "h-full" : "hidden"}>{lessonPanel}</div>
          <div className={activeTab === "editor" ? "h-full" : "hidden"}>{editor}</div>
          <div className={activeTab === "console" ? "h-full" : "hidden"}>{consolePanel}</div>
          <div className={activeTab === "files" ? "h-full" : "hidden"}>{fileExplorer}</div>
        </div>

        <nav className="grid shrink-0 grid-cols-4 border-t border-border bg-white">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "border-t-2 border-level-purple text-level-purple" : "border-t-2 border-transparent text-muted-foreground hover:text-level-purple",
                )}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>
    </>
  )
}
