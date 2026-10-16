"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { passwordSchema, usernameSchema, type UpdateMyProfileInput } from "@levelusp/contracts"
import { useAuth } from "@/contexts/auth-context"
import {
  changePassword,
  deleteMyAccount,
  errorMessage,
  exportMyData,
  updateMyProfile,
  uploadImage,
} from "@/lib/api"
import { swalConfirm } from "@/lib/swal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  Download,
} from "lucide-react"
import { getInitials } from "@/lib/utils"

const inputClass =
  "w-full rounded-xl border-2 border-border bg-white px-4 py-3 text-foreground focus:border-level-purple focus:outline-none transition-colors"

export default function SettingsPage() {
  const router = useRouter()
  const { profile, isLoading: authLoading, signOut, setProfile } = useAuth()
  const [activeTab, setActiveTab] = useState("profile")

  // Profile fields
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Segurança
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [securityError, setSecurityError] = useState("")
  const [securityMessage, setSecurityMessage] = useState("")
  const [deletePassword, setDeletePassword] = useState("")
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Hydrate fields from profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "")
      setUsername(profile.username ?? "")
      setBio(profile.bio ?? "")
      setAvatarUrl(profile.avatar_url ?? null)
    }
  }, [profile])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (file.size > 2 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 2MB.")
      return
    }
    setUploadingAvatar(true)
    setError("")
    try {
      const url = await uploadImage(file)
      const updated = await updateMyProfile({ avatar_url: url })
      setAvatarUrl(updated.avatar_url)
      setProfile(updated)
    } catch (err) {
      setError(errorMessage(err, "Erro ao enviar a foto. Tente novamente."))
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSecurityError("")
    setSecurityMessage("")
    const check = passwordSchema.safeParse(newPassword)
    if (!check.success) {
      setSecurityError(check.error.issues[0]?.message ?? "Senha inválida.")
      return
    }
    if (newPassword !== confirmPassword) {
      setSecurityError("As senhas não coincidem.")
      return
    }
    setChangingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setSecurityMessage("Senha alterada com sucesso!")
    } catch (err) {
      setSecurityError(errorMessage(err, "Não foi possível alterar a senha."))
    } finally {
      setChangingPassword(false)
    }
  }

  const handleExportData = async () => {
    setSecurityError("")
    setExporting(true)
    try {
      const data = await exportMyData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: `levelusp-meus-dados-${new Date().toISOString().slice(0, 10)}.json`,
      })
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setSecurityError(errorMessage(err, "Não foi possível exportar seus dados."))
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!profile) return
    setSecurityError("")
    if (!deletePassword) {
      setSecurityError("Informe sua senha para confirmar a exclusão da conta.")
      return
    }
    const confirmed = await swalConfirm({
      title: "Excluir sua conta?",
      text: "Todos os seus dados serão removidos permanentemente. Esta ação não pode ser desfeita.",
      confirmText: "Sim, excluir",
      danger: true,
    })
    if (!confirmed) return
    setDeletingAccount(true)
    try {
      await deleteMyAccount(deletePassword)
      setProfile(null)
      window.location.href = "/"
    } catch (err) {
      setSecurityError(errorMessage(err, "Erro ao excluir a conta. Tente novamente."))
      setDeletingAccount(false)
    }
  }

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !profile) {
      router.push("/login?next=/settings")
    }
  }, [authLoading, profile, router])

  const handleSave = async () => {
    if (!profile) return
    setError("")
    setSaved(false)

    const updates: UpdateMyProfileInput = {
      full_name: fullName.trim(),
      bio: bio.trim() || null,
    }
    const normalizedUsername = username.trim().toLowerCase()
    if (normalizedUsername !== (profile.username ?? "")) {
      const check = usernameSchema.safeParse(normalizedUsername)
      if (!check.success) {
        setError(check.error.issues[0]?.message ?? "Username inválido.")
        return
      }
      updates.username = check.data
    }
    if (!updates.full_name) {
      setError("Informe seu nome.")
      return
    }

    setSaving(true)
    try {
      const updated = await updateMyProfile(updates)
      setProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(errorMessage(err, "Erro ao salvar. Tente novamente."))
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/login"
  }

  const tabs = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "security", label: "Segurança", icon: Shield },
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
              <h1 className="text-lg font-bold text-level-purple-dark">Configurações</h1>
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
                        {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                        <AvatarFallback className="bg-level-purple-light text-xl font-bold text-level-purple-dark">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-level-purple text-white shadow-md hover:bg-level-purple-dark transition-colors disabled:opacity-60"
                        title="Alterar foto"
                      >
                        {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
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
                      Alterações salvas com sucesso!
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
                      <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
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
                          Salvar alterações
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
                {(securityError || securityMessage) && (
                  <div
                    role={securityError ? "alert" : "status"}
                    className={`rounded-xl px-4 py-3 text-sm ${securityError ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}
                  >
                    {securityError || securityMessage}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="rounded-2xl border border-border bg-white p-6">
                  <h2 className="mb-6 text-lg font-bold text-level-purple-dark">Alterar senha</h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="current-password" className="text-sm font-medium text-level-purple-dark">Senha atual</label>
                      <input
                        id="current-password"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="new-password" className="text-sm font-medium text-level-purple-dark">Nova senha</label>
                      <input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 10 caracteres, com letra e número"
                        required
                        minLength={10}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="confirm-new-password" className="text-sm font-medium text-level-purple-dark">Confirme a nova senha</label>
                      <input
                        id="confirm-new-password"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="mt-6">
                    <LevelButton type="submit" variant="primary" size="md" disabled={changingPassword}>
                      <span className="flex items-center gap-2">
                        {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                        Alterar senha
                      </span>
                    </LevelButton>
                  </div>
                </form>

                <div className="rounded-2xl border border-border bg-white p-6">
                  <h2 className="mb-2 text-lg font-bold text-level-purple-dark">Seus dados</h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Baixe uma cópia de todos os seus dados na plataforma (LGPD), em formato JSON.
                  </p>
                  <LevelButton variant="outline" size="md" onClick={handleExportData} disabled={exporting}>
                    <span className="flex items-center gap-2">
                      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Exportar meus dados
                    </span>
                  </LevelButton>
                </div>

                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
                  <h2 className="mb-2 text-lg font-bold text-destructive">Zona de perigo</h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Ao excluir sua conta, todos os seus dados serão permanentemente removidos.
                    Confirme com sua senha atual.
                  </p>
                  <div className="mb-4 space-y-2">
                    <label htmlFor="delete-password" className="text-sm font-medium text-destructive">Senha</label>
                    <input
                      id="delete-password"
                      type="password"
                      autoComplete="current-password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                    className="flex items-center gap-2 rounded-xl border-2 border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive hover:text-white transition-colors disabled:opacity-60"
                  >
                    {deletingAccount && <Loader2 className="h-4 w-4 animate-spin" />}
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
