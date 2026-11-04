"use client"

import Link from "next/link"
import {
  BarChart3, BookOpen, ChevronRight, GraduationCap, History, Layers, LayoutDashboard, Package, Settings, ShieldCheck,
  Sparkles, Users, type LucideIcon,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ROUTES } from "@/lib/constants"
import { cn, getInitials } from "@/lib/utils"
import type { AdminPageId } from "./admin-pages"

export interface SidebarCounts {
  courses: number
  lessons: number
  users: number
  approvals: number
}

interface NavItem {
  id: AdminPageId
  label: string
  icon: LucideIcon
  countKey?: keyof SidebarCounts
  badge?: string
}

interface NavSection {
  header: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    header: "PAINEL",
    items: [
      { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
      { id: "analytics", label: "Analytics", icon: BarChart3, badge: "novo" },
    ],
  },
  {
    header: "CONTEÚDO",
    items: [
      { id: "courses", label: "Cursos", icon: GraduationCap, countKey: "courses" },
      { id: "lessons", label: "Lições", icon: BookOpen, countKey: "lessons" },
      { id: "modules", label: "Módulos", icon: Layers },
      { id: "libraries", label: "Bibliotecas", icon: Package },
      { id: "exams", label: "Prova Final", icon: GraduationCap },
      { id: "badges", label: "Badges", icon: Sparkles },
    ],
  },
  {
    header: "PESSOAS",
    items: [
      { id: "users", label: "Usuários", icon: Users, countKey: "users" },
      { id: "approvals", label: "Aprovações", icon: ShieldCheck, countKey: "approvals" },
    ],
  },
  {
    header: "SISTEMA",
    items: [
      { id: "audit", label: "Logs · auditoria", icon: History },
      { id: "settings", label: "Ajustes", icon: Settings },
    ],
  },
]

interface AdminSidebarProps {
  current: AdminPageId
  onNavigate: (page: AdminPageId) => void
  counts: SidebarCounts
  profileName: string
  profileEmail: string
}

export function AdminSidebar({ current, onNavigate, counts, profileName, profileEmail }: AdminSidebarProps) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-white">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-level-purple to-level-purple-medium shadow-sm">
          <span className="text-sm font-extrabold text-white">L</span>
          <div className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-warning" />
        </div>
        <div>
          <p className="text-sm font-extrabold leading-tight text-level-purple-dark">LevelUSP</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Admin Console</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.header}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{section.header}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  count={item.countKey ? counts[item.countKey] : undefined}
                  isActive={current === item.id}
                  onSelect={() => onNavigate(item.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Sem card de "saúde da plataforma" até existir monitoramento real: os números seriam fictícios. */}

      <div className="flex items-center gap-3 border-t border-border p-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-destructive/10 text-xs font-bold text-destructive">{getInitials(profileName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-level-purple-dark">{profileName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{profileEmail}</p>
        </div>
        <Link
          href={ROUTES.dashboard}
          title="Voltar à plataforma"
          aria-label="Voltar à plataforma"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-level-purple-light hover:text-level-purple"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </Link>
      </div>
    </aside>
  )
}

interface SidebarItemProps {
  item: NavItem
  count: number | undefined
  isActive: boolean
  onSelect: () => void
}

function SidebarItem({ item, count, isActive, onSelect }: SidebarItemProps) {
  const Icon = item.icon
  // Aprovações pendentes chamam atenção mesmo fora da seção ativa.
  const isUrgent = item.countKey === "approvals" && count !== undefined && count > 0
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all",
        isActive
          ? "bg-linear-to-br from-level-purple to-level-purple-medium text-white shadow-sm shadow-level-purple/30"
          : "text-foreground hover:bg-level-purple-subtle hover:text-level-purple",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 text-left">{item.label}</span>
      {item.badge && (
        <span className="rounded bg-linear-to-r from-warning to-destructive px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white">
          {item.badge}
        </span>
      )}
      {count !== undefined && (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-bold",
            isActive ? "bg-white/20 text-white" : isUrgent ? "bg-destructive/10 text-red-700" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
