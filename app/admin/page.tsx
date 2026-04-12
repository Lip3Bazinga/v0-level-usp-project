"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LevelButton } from "@/components/design-system/level-button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Rocket,
  ChevronLeft,
  Users,
  BookOpen,
  BarChart3,
  Shield,
  Search,
  MoreHorizontal,
  UserCheck,
  UserX,
  TrendingUp,
  Activity,
  GraduationCap,
  Crown,
  AlertCircle,
} from "lucide-react"

// Mock platform metrics
const platformMetrics = {
  totalUsers: 12487,
  activeUsers30d: 8342,
  totalLessons: 156,
  publishedLessons: 128,
  totalCompletions: 245000,
  avgDailyActive: 2150,
  teachers: 23,
  admins: 3,
}

// Mock users for management
const mockUsers = [
  { id: "1", name: "Ana Beatriz Souza", email: "ana.souza@usp.br", role: "student" as const, level: 32, totalXp: 78450, status: "active" as const, joinedAt: "2024-01-15" },
  { id: "2", name: "Prof. Ricardo Lima", email: "ricardo.lima@usp.br", role: "teacher" as const, level: 45, totalXp: 120000, status: "active" as const, joinedAt: "2023-09-01" },
  { id: "3", name: "Carlos Eduardo Mendes", email: "carlos.mendes@usp.br", role: "student" as const, level: 30, totalXp: 72100, status: "active" as const, joinedAt: "2024-02-20" },
  { id: "4", name: "Maria Clara Ferreira", email: "maria.ferreira@usp.br", role: "student" as const, level: 29, totalXp: 68920, status: "inactive" as const, joinedAt: "2024-03-10" },
  { id: "5", name: "Prof. Juliana Santos", email: "juliana.santos@usp.br", role: "teacher" as const, level: 38, totalXp: 95000, status: "active" as const, joinedAt: "2023-11-15" },
  { id: "6", name: "Pedro Henrique Oliveira", email: "pedro.oliveira@usp.br", role: "student" as const, level: 27, totalXp: 61500, status: "active" as const, joinedAt: "2024-04-05" },
  { id: "7", name: "Fernanda Lima Costa", email: "fernanda.costa@usp.br", role: "student" as const, level: 25, totalXp: 54800, status: "active" as const, joinedAt: "2024-05-12" },
  { id: "8", name: "Admin Sistema", email: "admin@levelusp.com", role: "admin" as const, level: 50, totalXp: 200000, status: "active" as const, joinedAt: "2023-01-01" },
]

function getRoleBadge(role: string) {
  switch (role) {
    case "admin":
      return <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Admin</Badge>
    case "teacher":
      return <Badge className="bg-level-purple/10 text-level-purple border-0 text-xs">Professor</Badge>
    default:
      return <Badge className="bg-muted text-muted-foreground border-0 text-xs">Aluno</Badge>
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-success/10 text-success border-0 text-xs">Ativo</Badge>
    default:
      return <Badge className="bg-muted text-muted-foreground border-0 text-xs">Inativo</Badge>
  }
}

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [users, setUsers] = useState(mockUsers)

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const handleRoleChange = (userId: string, newRole: "student" | "teacher" | "admin") => {
    setUsers((prev: any) =>
      prev.map((u: any) => (u.id === userId ? { ...u, role: newRole } : u))
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-level-purple transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Dashboard</span>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-level-purple-dark">Admin Console</h1>
                <p className="text-xs text-muted-foreground">Gestao da Plataforma</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Platform Metrics */}
        <h2 className="mb-4 text-lg font-bold text-level-purple-dark">Metricas da Plataforma</h2>
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                <Users className="h-5 w-5 text-level-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">{platformMetrics.totalUsers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Usuarios Total</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <Activity className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">{platformMetrics.activeUsers30d.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Ativos (30 dias)</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">{platformMetrics.avgDailyActive.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Media Diaria Ativa</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light">
                <BookOpen className="h-5 w-5 text-level-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-level-purple-dark">{platformMetrics.publishedLessons}/{platformMetrics.totalLessons}</p>
                <p className="text-xs text-muted-foreground">Licoes Publicadas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Role Distribution */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <GraduationCap className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-level-purple-dark">
                {platformMetrics.totalUsers - platformMetrics.teachers - platformMetrics.admins}
              </p>
              <p className="text-sm text-muted-foreground">Alunos</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple-light">
              <BookOpen className="h-6 w-6 text-level-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold text-level-purple-dark">{platformMetrics.teachers}</p>
              <p className="text-sm text-muted-foreground">Professores</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <Crown className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-level-purple-dark">{platformMetrics.admins}</p>
              <p className="text-sm text-muted-foreground">Administradores</p>
            </div>
          </div>
        </div>

        {/* User Management */}
        <h2 className="mb-4 text-lg font-bold text-level-purple-dark">Gestao de Usuarios</h2>
        <div className="rounded-2xl border border-border bg-white">
          {/* Toolbar */}
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              {[
                { value: "all", label: "Todos" },
                { value: "student", label: "Alunos" },
                { value: "teacher", label: "Professores" },
                { value: "admin", label: "Admins" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setRoleFilter(f.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${roleFilter === f.value
                    ? "bg-level-purple text-white"
                    : "bg-muted text-muted-foreground hover:bg-level-purple-subtle"
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Table */}
          <div className="divide-y divide-border">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className={`text-sm font-bold ${user.role === "admin" ? "bg-destructive/10 text-destructive" :
                    user.role === "teacher" ? "bg-level-purple-light text-level-purple-dark" :
                      "bg-muted text-muted-foreground"
                    }`}>
                    {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-level-purple-dark">{user.name}</p>
                    {getRoleBadge(user.role)}
                    {getStatusBadge(user.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>

                <div className="hidden sm:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-level-purple-dark">Nv. {user.level}</p>
                    <p className="text-xs text-muted-foreground">Nivel</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-level-purple-dark">{user.totalXp.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">XP</p>
                  </div>
                </div>

                {/* Role Change Dropdown */}
                <Select
                  value={user.role}
                  onValueChange={(value) => handleRoleChange(user.id, value as "student" | "teacher" | "admin")}
                >
                  <SelectTrigger className="h-9 w-32 rounded-lg border border-border text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Aluno</SelectItem>
                    <SelectItem value="teacher">Professor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-4 text-sm text-muted-foreground">Nenhum usuario encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* Warning */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-warning mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Atencao ao promover usuarios</p>
            <p className="text-xs text-muted-foreground mt-1">
              Professores podem criar e editar licoes. Administradores tem acesso total a plataforma.
              Altere roles com cuidado.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
