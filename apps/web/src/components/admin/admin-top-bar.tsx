"use client"

import Link from "next/link"
import { ChevronRight, Menu, Plus, Search } from "lucide-react"
import { NotificationBell } from "@/components/notification-bell"
import { ROUTES } from "@/lib/constants"
import { openAdminSearch } from "./command-palette"

export interface TopBarAction {
  href: string
  label: string
}

interface AdminTopBarProps {
  title: string
  primaryAction?: TopBarAction
  onMenuClick: () => void
}

export function AdminTopBar({ title, primaryAction, onMenuClick }: AdminTopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/85 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuClick}
            aria-label="Abrir menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-level-purple-light hover:text-level-purple lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span>LevelUSP</span>
              <ChevronRight className="h-3 w-3" />
              <span>Admin</span>
            </div>
            <h1 className="truncate text-lg font-extrabold leading-tight text-level-purple-dark sm:text-xl">{title}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={openAdminSearch} className="relative hidden items-center lg:flex">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <span className="w-72 cursor-text rounded-xl border border-border bg-white py-2 pl-9 pr-12 text-left text-sm text-muted-foreground hover:border-level-purple">
              Buscar usuário, lição, curso...
            </span>
            <kbd className="absolute right-3 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
          </button>
          <NotificationBell />
          <Link
            href={ROUTES.dashboard}
            aria-label="Voltar à plataforma"
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-level-purple hover:text-level-purple"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            <span className="hidden sm:inline">Voltar à plataforma</span>
          </Link>
          {primaryAction && (
            <Link href={primaryAction.href} className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2 text-sm font-bold text-white">
              <Plus className="h-4 w-4" /> {primaryAction.label}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
