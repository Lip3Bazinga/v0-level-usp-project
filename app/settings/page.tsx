"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LevelButton } from "@/components/design-system/level-button"
import {
  Rocket,
  ChevronLeft,
  User,
  Mail,
  Lock,
  Shield,
  LogOut,
  Camera,
  Save,
  Loader2,
  CheckCircle2,
} from "lucide-react"

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
}

export default function SettingsPage() {
  const router = useRouter()
  const { profile, isLoading: authLoading, signOut, refreshProfile } = useAuth()
  const [activeTab, setActiveTab] = useState("profile")

  // Profile fields
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  // Hydrate fields from profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "")
      setUsername(profile.username ?? "")
      setBio(profile.bio ?? "")
    }
  }, [profile])

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !profile) {
      router.push("/login?redirect=/settings")
    }
  }, [authLoading, profile, router])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    setError("")
    setSaved(false)

    const supabase = createClient()
    const updates: Record<string, unknown> = {
      full_name: fullName.trim(),
      username: username.trim().toLowerCase(),
      bio: bio.trim() || null,
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates as never)
      .eq("id", profile.id)

    if (updateError) {
      if (updateError.message.includes("duplicate") || updateError.message.includes("unique")) {
        setError("Este username ja esta em uso. Escolha outro.")
      } else {
        setError("Erro ao salvar. Tente novamente.")
      }
    } else {
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }

    setSaving(false)
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/login"
  }

  const tabs = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "security", label: "Seguranca", icon: Shield },
  ]

  if (authLoading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
      </div>
    )
  }

  const initials = getInitials(profile.full_name)

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

              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
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
                          {initials}
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

                  {error && (
                    <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  {saved && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      Alteracoes salvas com sucesso!
                    </div>
                  )}

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
                          value={profile.email}
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

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-white p-6">
                  <h2 className="mb-6 text-lg font-bold text-level-purple-dark">Alterar Senha</h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Para alterar sua senha, clique no botao abaixo. Um email sera enviado para <strong>{profile.email}</strong> com as instrucoes.
                  </p>
                  <LevelButton
                    variant="primary"
                    size="md"
                    onClick={async () => {
                      const supabase = createClient()
                      await supabase.auth.resetPasswordForEmail(profile.email, {
                        redirectTo: `${window.location.origin}/auth/callback?redirect=/settings`,
                      })
                      alert("Email enviado! Verifique sua caixa de entrada.")
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Enviar email de redefinicao
                    </span>
                  </LevelButton>
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
