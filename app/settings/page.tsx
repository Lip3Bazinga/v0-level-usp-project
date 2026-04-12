"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LevelButton } from "@/components/design-system/level-button"
import {
  Rocket,
  ChevronLeft,
  User,
  Mail,
  Lock,
  Bell,
  Palette,
  Globe,
  Shield,
  LogOut,
  Camera,
  Save,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile")
  const [fullName, setFullName] = useState("Joao Silva")
  const [username, setUsername] = useState("joaosilva")
  const [bio, setBio] = useState("Estudante de Ciencia da Computacao na USP.")
  const [email] = useState("joao.silva@usp.br")
  const [notifications, setNotifications] = useState({
    email: true,
    streak: true,
    leaderboard: false,
    newLessons: true,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 1000))
    setSaving(false)
  }

  const tabs = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "notifications", label: "Notificacoes", icon: Bell },
    { id: "security", label: "Seguranca", icon: Shield },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <button className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-level-purple-light hover:text-level-purple transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
                <Rocket className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-level-purple-dark">Configuracoes</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Sidebar Tabs */}
          <nav className="w-full md:w-56 shrink-0">
            <div className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-level-purple text-white"
                      : "text-muted-foreground hover:bg-level-purple-subtle hover:text-level-purple-dark"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}

              <div className="my-4 border-t border-border" />

              <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="h-4 w-4" />
                Sair da conta
              </button>
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-white p-6">
                  <h2 className="mb-6 text-lg font-bold text-level-purple-dark">Dados Pessoais</h2>

                  {/* Avatar */}
                  <div className="mb-6 flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-20 w-20 border-4 border-level-purple-light">
                        <AvatarFallback className="bg-level-purple-light text-xl font-bold text-level-purple-dark">
                          JS
                        </AvatarFallback>
                      </Avatar>
                      <button className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-level-purple text-white shadow-md hover:bg-level-purple-dark transition-colors">
                        <Camera className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-level-purple-dark">Foto de perfil</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG. Max 2MB.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-level-purple-dark">Nome completo</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-foreground focus:border-level-purple focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-level-purple-dark">Username</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full rounded-xl border-2 border-border bg-white pl-8 pr-4 py-3 text-foreground focus:border-level-purple focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-level-purple-dark">Bio</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-foreground focus:border-level-purple focus:outline-none transition-colors resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-level-purple-dark">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="email"
                          value={email}
                          disabled
                          className="w-full rounded-xl border-2 border-border bg-muted pl-11 pr-4 py-3 text-muted-foreground cursor-not-allowed"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">O email nao pode ser alterado.</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <LevelButton variant="primary" size="md" onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <span className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Salvando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Salvar alteracoes
                        </span>
                      )}
                    </LevelButton>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="rounded-2xl border border-border bg-white p-6">
                <h2 className="mb-6 text-lg font-bold text-level-purple-dark">Preferencias de Notificacao</h2>
                <div className="space-y-4">
                  {[
                    { key: "email" as const, label: "Notificacoes por email", desc: "Receba atualizacoes no seu email" },
                    { key: "streak" as const, label: "Lembrete de streak", desc: "Nao perca sua sequencia diaria" },
                    { key: "leaderboard" as const, label: "Mudancas no ranking", desc: "Saiba quando subir ou descer no ranking" },
                    { key: "newLessons" as const, label: "Novas licoes", desc: "Seja notificado quando novas licoes forem publicadas" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-xl border border-border p-4">
                      <div>
                        <p className="text-sm font-medium text-level-purple-dark">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                        }
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          notifications[item.key] ? "bg-level-purple" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            notifications[item.key] ? "translate-x-5" : ""
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-white p-6">
                  <h2 className="mb-6 text-lg font-bold text-level-purple-dark">Alterar Senha</h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-level-purple-dark">Senha atual</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="password"
                          placeholder="Sua senha atual"
                          className="w-full rounded-xl border-2 border-border bg-white pl-11 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-level-purple-dark">Nova senha</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="password"
                          placeholder="Minimo 6 caracteres"
                          className="w-full rounded-xl border-2 border-border bg-white pl-11 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <LevelButton variant="primary" size="md">
                      Atualizar senha
                    </LevelButton>
                  </div>
                </div>

                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
                  <h2 className="mb-2 text-lg font-bold text-destructive">Zona de perigo</h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Ao excluir sua conta, todos os seus dados serao permanentemente removidos.
                  </p>
                  <button className="rounded-xl border-2 border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive hover:text-white transition-colors">
                    Excluir minha conta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
