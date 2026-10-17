"use client"

import { useState, type FormEvent } from "react"
import { Download, Loader2, Lock } from "lucide-react"
import { passwordSchema } from "@levelusp/contracts"
import { LevelButton } from "@/components/design-system/level-button"
import { useAuth } from "@/contexts/auth-context"
import { changePassword, deleteMyAccount, fetchMyDataExport, getErrorMessage } from "@/lib/api"
import { ROUTES } from "@/lib/constants"
import { swalConfirm } from "@/lib/swal"
import { localDateKey } from "@/lib/utils"
import { INPUT_CLASS, LABEL_CLASS } from "./settings-styles"

type SecurityFeedback = { kind: "error" | "success"; message: string } | null

function downloadJson(fileName: string, data: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }))
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName })
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Troca de senha, exportação LGPD e exclusão da conta. Fica acima das abas, como o perfil. */
export function useSecuritySettings() {
  const { setProfile } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [deletePassword, setDeletePassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [feedback, setFeedback] = useState<SecurityFeedback>(null)
  const showError = (message: string) => setFeedback({ kind: "error", message })

  const submitPasswordChange = async (event: FormEvent) => {
    event.preventDefault()
    setFeedback(null)
    const passwordCheck = passwordSchema.safeParse(newPassword)
    if (!passwordCheck.success) {
      showError(passwordCheck.error.issues[0]?.message ?? "Senha inválida.")
      return
    }
    if (newPassword !== confirmPassword) {
      showError("As senhas não coincidem.")
      return
    }
    setIsChangingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setFeedback({ kind: "success", message: "Senha alterada com sucesso!" })
    } catch (error) {
      showError(getErrorMessage(error, "Não foi possível alterar a senha."))
    } finally {
      setIsChangingPassword(false)
    }
  }

  const exportData = async () => {
    setFeedback(null)
    setIsExporting(true)
    try {
      downloadJson(`levelusp-meus-dados-${localDateKey(new Date())}.json`, await fetchMyDataExport())
    } catch (error) {
      showError(getErrorMessage(error, "Não foi possível exportar seus dados."))
    } finally {
      setIsExporting(false)
    }
  }

  const deleteAccount = async () => {
    setFeedback(null)
    if (!deletePassword) {
      showError("Informe sua senha para confirmar a exclusão da conta.")
      return
    }
    const isConfirmed = await swalConfirm({
      title: "Excluir sua conta?",
      text: "Todos os seus dados serão removidos permanentemente. Esta ação não pode ser desfeita.",
      confirmText: "Sim, excluir",
      danger: true,
    })
    if (!isConfirmed) return
    setIsDeletingAccount(true)
    try {
      await deleteMyAccount(deletePassword)
      setProfile(null)
      // Navegação completa: nada da sessão excluída fica em memória.
      window.location.assign(ROUTES.home)
    } catch (error) {
      showError(getErrorMessage(error, "Erro ao excluir a conta. Tente novamente."))
      setIsDeletingAccount(false)
    }
  }

  return {
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    deletePassword, setDeletePassword,
    isChangingPassword, isExporting, isDeletingAccount,
    feedback,
    submitPasswordChange, exportData, deleteAccount,
  }
}

type SecuritySettings = ReturnType<typeof useSecuritySettings>

interface PasswordFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: "current-password" | "new-password"
  placeholder?: string
  minLength?: number
  isRequired?: boolean
  labelClassName?: string
}

function PasswordField({
  id, label, value, onChange, autoComplete, placeholder, minLength, isRequired = true, labelClassName = LABEL_CLASS,
}: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={labelClassName}>{label}</label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={isRequired}
        minLength={minLength}
        className={INPUT_CLASS}
      />
    </div>
  )
}

export function SecuritySettingsSection({ security }: { security: SecuritySettings }) {
  const { feedback } = security
  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`rounded-xl px-4 py-3 text-sm ${feedback.kind === "error" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={security.submitPasswordChange} className="rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-6 text-lg font-bold text-level-purple-dark">Alterar senha</h2>
        <div className="space-y-4">
          <PasswordField
            id="current-password"
            label="Senha atual"
            autoComplete="current-password"
            value={security.currentPassword}
            onChange={security.setCurrentPassword}
          />
          <PasswordField
            id="new-password"
            label="Nova senha"
            autoComplete="new-password"
            value={security.newPassword}
            onChange={security.setNewPassword}
            placeholder="Mínimo 10 caracteres, com letra e número"
            minLength={10}
          />
          <PasswordField
            id="confirm-new-password"
            label="Confirme a nova senha"
            autoComplete="new-password"
            value={security.confirmPassword}
            onChange={security.setConfirmPassword}
          />
        </div>
        <div className="mt-6">
          <LevelButton type="submit" variant="primary" size="md" disabled={security.isChangingPassword}>
            <span className="flex items-center gap-2">
              {security.isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
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
        <LevelButton variant="outline" size="md" onClick={security.exportData} disabled={security.isExporting}>
          <span className="flex items-center gap-2">
            {security.isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar meus dados
          </span>
        </LevelButton>
      </div>

      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="mb-2 text-lg font-bold text-destructive">Zona de perigo</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Ao excluir sua conta, todos os seus dados serão permanentemente removidos. Confirme com sua senha atual.
        </p>
        <div className="mb-4">
          <PasswordField
            id="delete-password"
            label="Senha"
            autoComplete="current-password"
            value={security.deletePassword}
            onChange={security.setDeletePassword}
            isRequired={false}
            labelClassName="text-sm font-medium text-destructive"
          />
        </div>
        <button
          onClick={security.deleteAccount}
          disabled={security.isDeletingAccount}
          className="flex items-center gap-2 rounded-xl border-2 border-destructive px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-white disabled:opacity-60"
        >
          {security.isDeletingAccount && <Loader2 className="h-4 w-4 animate-spin" />}
          Excluir minha conta
        </button>
      </div>
    </div>
  )
}
