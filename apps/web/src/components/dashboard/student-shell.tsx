"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BookOpen, Flame, GraduationCap, LayoutDashboard, LogOut, NotebookPen, Rocket, Settings, Shield, Star, Trophy, User, Zap,
  type LucideIcon,
} from "lucide-react"
import type { UserRole } from "@levelusp/contracts"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { useSignOut } from "@/hooks/use-sign-out"
import { ROUTES } from "@/lib/constants"
import { cn, formatXp, getInitials } from "@/lib/utils"

type StudentNavItemId = "learn" | "courses" | "leaderboard" | "notes" | "profile" | "settings"

export type StudentScreen = "dashboard" | "courses" | "leaderboard"

interface StudentNavItem {
  label: string
  /** Rótulo na barra inferior, quando difere do cabeçalho. */
  mobileLabel?: string
  icon: LucideIcon
  href: (username: string | null | undefined) => string
}

const NAV_ITEMS: Record<StudentNavItemId, StudentNavItem> = {
  learn: { label: "Aprender", icon: BookOpen, href: () => ROUTES.dashboard },
  courses: { label: "Cursos", icon: GraduationCap, href: () => ROUTES.courses },
  leaderboard: { label: "Ranking", icon: Trophy, href: () => ROUTES.leaderboard },
  notes: { label: "Notas", icon: NotebookPen, href: () => ROUTES.notes },
  profile: { label: "Perfil", icon: User, href: (username) => ROUTES.profile(username) },
  settings: { label: "Configurações", mobileLabel: "Config", icon: Settings, href: () => ROUTES.settings },
}

interface ScreenLayout {
  activeItem: StudentNavItemId
  desktopItems: readonly StudentNavItemId[]
  mobileItems: readonly StudentNavItemId[]
  iconOverrides?: Partial<Record<StudentNavItemId, LucideIcon>>
  /** Painel e cursos têm o menu da conta; o ranking mostra só XP e sequência de quem está logado. */
  hasAccountMenu: boolean
  mobileItemClassName: string
  /** `true`: todos os rótulos da barra inferior em peso médio; `false`: só o ativo. */
  hasUniformMobileLabels: boolean
  bottomPaddingClassName: string
}

/**
 * Cada tela ainda mostra um conjunto próprio de itens (UX-30, pendente de decisão de
 * produto). A divergência fica concentrada aqui para que unificar seja trocar esta tabela.
 */
const SCREEN_LAYOUTS: Record<StudentScreen, ScreenLayout> = {
  dashboard: {
    activeItem: "learn",
    desktopItems: ["learn", "courses", "leaderboard", "notes", "profile"],
    mobileItems: ["learn", "courses", "leaderboard", "notes", "profile"],
    hasAccountMenu: true,
    mobileItemClassName: "px-3",
    hasUniformMobileLabels: false,
    bottomPaddingClassName: "pb-24 lg:pb-12",
  },
  courses: {
    activeItem: "courses",
    desktopItems: ["learn", "courses", "leaderboard", "profile"],
    mobileItems: ["learn", "courses", "leaderboard", "profile"],
    iconOverrides: { courses: Star },
    hasAccountMenu: true,
    mobileItemClassName: "px-3",
    hasUniformMobileLabels: false,
    bottomPaddingClassName: "pb-24 lg:pb-8",
  },
  leaderboard: {
    activeItem: "leaderboard",
    desktopItems: ["learn", "leaderboard", "profile"],
    mobileItems: ["learn", "leaderboard", "profile", "settings"],
    hasAccountMenu: false,
    mobileItemClassName: "px-4",
    hasUniformMobileLabels: true,
    bottomPaddingClassName: "pb-24 lg:pb-8",
  },
}

const TEACHING_ROLES: readonly UserRole[] = ["teacher", "admin"]

interface StudentShellProps {
  screen: StudentScreen
  children: ReactNode
}

/** Cabeçalho, barra inferior móvel e menu da conta das telas do aluno (painel, cursos, ranking). */
export function StudentShell({ screen, children }: StudentShellProps) {
  const layout = SCREEN_LAYOUTS[screen]
  const { profile } = useAuth()
  const username = profile?.username

  return (
    <div className={cn("min-h-screen bg-background", layout.bottomPaddingClassName)}>
      <StudentHeaderBar>
        <BrandLink />
        <nav aria-label="Navegação principal" className="hidden items-center gap-6 lg:flex">
          {layout.desktopItems.map((itemId) => (
            <DesktopNavLink key={itemId} itemId={itemId} layout={layout} username={username} />
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {(layout.hasAccountMenu || profile) && (
            <>
              <XpChip totalXp={profile?.total_xp ?? 0} />
              <StreakChip streak={profile?.current_streak ?? 0} />
            </>
          )}
          {layout.hasAccountMenu && <StudentAccountMenu />}
        </div>
      </StudentHeaderBar>

      {children}

      <nav aria-label="Navegação principal" className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white lg:hidden">
        <div className="flex items-center justify-around py-2">
          {layout.mobileItems.map((itemId) => (
            <MobileNavLink key={itemId} itemId={itemId} layout={layout} username={username} />
          ))}
        </div>
      </nav>
    </div>
  )
}

/** Faixa fixa no topo, comum às telas do aluno (inclusive as que não usam o shell completo). */
export function StudentHeaderBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
      <div className={cn("mx-auto flex h-16 max-w-6xl items-center justify-between px-4", className)}>{children}</div>
    </header>
  )
}

interface BrandLinkProps {
  /** `compact`: marca menor, usada ao lado de um botão de voltar. */
  size?: "regular" | "compact"
}

export function BrandLink({ size = "regular" }: BrandLinkProps) {
  const isCompact = size === "compact"
  return (
    <Link href={ROUTES.dashboard} className={cn("flex items-center", isCompact ? "gap-2" : "gap-3")}>
      <div className={cn("flex items-center justify-center rounded-xl bg-level-purple", isCompact ? "h-8 w-8" : "h-10 w-10")}>
        <Rocket className={cn("text-white", isCompact ? "h-4 w-4" : "h-5 w-5")} />
      </div>
      <span className={cn("font-bold text-level-purple-dark", isCompact ? "text-lg" : "text-xl")}>LevelUSP</span>
    </Link>
  )
}

interface NavLinkProps {
  itemId: StudentNavItemId
  layout: ScreenLayout
  username: string | null | undefined
}

function DesktopNavLink({ itemId, layout, username }: NavLinkProps) {
  const item = NAV_ITEMS[itemId]
  const Icon = layout.iconOverrides?.[itemId] ?? item.icon
  const isActive = itemId === layout.activeItem
  return (
    <Link
      href={item.href(username)}
      className={cn(
        "flex items-center gap-2 text-sm font-medium",
        isActive ? "text-level-purple" : "text-muted-foreground transition-colors hover:text-level-purple",
      )}
    >
      <Icon className="h-4 w-4" /> {item.label}
    </Link>
  )
}

function MobileNavLink({ itemId, layout, username }: NavLinkProps) {
  const item = NAV_ITEMS[itemId]
  const Icon = layout.iconOverrides?.[itemId] ?? item.icon
  const isActive = itemId === layout.activeItem
  const hasMediumLabel = isActive || layout.hasUniformMobileLabels
  return (
    <Link
      href={item.href(username)}
      className={cn(
        "flex flex-col items-center gap-1 py-2",
        layout.mobileItemClassName,
        isActive ? "text-level-purple" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className={cn("text-xs", hasMediumLabel && "font-medium")}>{item.mobileLabel ?? item.label}</span>
    </Link>
  )
}

export function XpChip({ totalXp }: { totalXp: number }) {
  return (
    <div className="hidden items-center gap-1.5 rounded-full bg-level-purple px-3 py-1.5 text-white sm:flex">
      <Zap className="h-4 w-4 text-yellow-300" />
      <span className="text-xs font-bold">{formatXp(totalXp)}</span>
    </div>
  )
}

export function StreakChip({ streak }: { streak: number }) {
  return (
    <div className="hidden items-center gap-1.5 rounded-full bg-linear-to-r from-orange-500 to-red-500 px-3 py-1.5 text-white sm:flex">
      <Flame className="h-4 w-4 text-yellow-300" />
      <span className="text-xs font-bold">{streak}</span>
    </div>
  )
}

function StudentAccountMenu() {
  const { profile, isLoading } = useAuth()
  const initials = profile?.full_name ? getInitials(profile.full_name) : "?"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Menu da conta (${initials})`}
          className="rounded-full ring-2 ring-level-purple ring-offset-2 transition-shadow hover:ring-offset-0"
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-level-purple-light text-xs font-bold text-level-purple-dark">
              {isLoading ? "…" : initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <AccountMenuContent hasRoleLinks />
    </DropdownMenu>
  )
}

interface AccountMenuContentProps {
  /** Atalho para o painel (a IDE não tem a navegação principal). */
  hasDashboardLink?: boolean
  /** Atalhos para os painéis de professor e admin, conforme o papel. */
  hasRoleLinks?: boolean
}

/** Itens do menu da conta, compartilhados pelo cabeçalho do aluno e pelo da IDE. */
export function AccountMenuContent({ hasDashboardLink = false, hasRoleLinks = false }: AccountMenuContentProps) {
  const router = useRouter()
  const { profile } = useAuth()
  const signOut = useSignOut()
  const role = profile?.role
  return (
    <DropdownMenuContent align="end" className="w-48">
      {hasDashboardLink && (
        <DropdownMenuItem onClick={() => router.push(ROUTES.dashboard)}>
          <LayoutDashboard className="mr-2 h-4 w-4" /> Painel
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => router.push(ROUTES.profile(profile?.username))}>
        <User className="mr-2 h-4 w-4" /> Meu Perfil
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => router.push(ROUTES.settings)}>
        <Settings className="mr-2 h-4 w-4" /> Configurações
      </DropdownMenuItem>
      {hasRoleLinks && role && TEACHING_ROLES.includes(role) && (
        <DropdownMenuItem onClick={() => router.push(ROUTES.teacher)}>
          <BookOpen className="mr-2 h-4 w-4" /> Painel Professor
        </DropdownMenuItem>
      )}
      {hasRoleLinks && role === "admin" && (
        <DropdownMenuItem onClick={() => router.push(ROUTES.admin)}>
          <Shield className="mr-2 h-4 w-4" /> Painel Admin
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-destructive" onClick={() => void signOut()}>
        <LogOut className="mr-2 h-4 w-4" /> Sair
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}
