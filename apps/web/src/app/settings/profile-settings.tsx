"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { Camera, CheckCircle2, Loader2, Mail, Save } from "lucide-react"
import { usernameSchema, type Profile, type UpdateMyProfileInput } from "@levelusp/contracts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LevelButton } from "@/components/design-system/level-button"
import { useAuth } from "@/contexts/auth-context"
import { useTransientValue } from "@/hooks/use-transient-value"
import { getErrorMessage, updateMyProfile, uploadImage } from "@/lib/api"
import { getInitials } from "@/lib/utils"
import { INPUT_CLASS, LABEL_CLASS } from "./settings-styles"

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024
const SAVED_FEEDBACK_MS = 3_000
const ACCEPTED_AVATAR_TYPES = "image/jpeg,image/png,image/webp"

interface ProfileFields {
  fullName: string
  username: string
  bio: string
}

function fieldsFrom(profile: Profile): ProfileFields {
  return { fullName: profile.full_name, username: profile.username ?? "", bio: profile.bio ?? "" }
}

type ProfileUpdate = { ok: true; input: UpdateMyProfileInput } | { ok: false; error: string }

/** Monta a atualização do perfil; o username só vai quando muda (e precisa passar no schema). */
export function buildProfileUpdate(fields: ProfileFields, currentUsername: string | null): ProfileUpdate {
  const input: UpdateMyProfileInput = { full_name: fields.fullName.trim(), bio: fields.bio.trim() || null }
  const normalizedUsername = fields.username.trim().toLowerCase()
  if (normalizedUsername !== (currentUsername ?? "")) {
    const usernameCheck = usernameSchema.safeParse(normalizedUsername)
    if (!usernameCheck.success) return { ok: false, error: usernameCheck.error.issues[0]?.message ?? "Username inválido." }
    input.username = usernameCheck.data
  }
  if (!input.full_name) return { ok: false, error: "Informe seu nome." }
  return { ok: true, input }
}

/**
 * Estado do formulário de perfil. Fica acima das abas para que trocar de aba não
 * descarte o que o aluno digitou e ainda não salvou.
 */
export function useProfileForm(profile: Profile) {
  const { setProfile } = useAuth()
  const [fields, setFields] = useState(() => fieldsFrom(profile))
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [error, setError] = useState("")
  const savedFeedback = useTransientValue<true>(SAVED_FEEDBACK_MS)

  const updateField = (field: keyof ProfileFields, value: string) => setFields((current) => ({ ...current, [field]: value }))

  const save = async () => {
    setError("")
    savedFeedback.clear()
    const update = buildProfileUpdate(fields, profile.username)
    if (!update.ok) {
      setError(update.error)
      return
    }
    setIsSaving(true)
    try {
      const updatedProfile = await updateMyProfile(update.input)
      setProfile(updatedProfile)
      setFields(fieldsFrom(updatedProfile))
      savedFeedback.show(true)
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Erro ao salvar. Tente novamente."))
    } finally {
      setIsSaving(false)
    }
  }

  const changeAvatar = async (file: File) => {
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError("A imagem deve ter no máximo 2MB.")
      return
    }
    setIsUploadingAvatar(true)
    setError("")
    try {
      const updatedProfile = await updateMyProfile({ avatar_url: await uploadImage(file) })
      setAvatarUrl(updatedProfile.avatar_url)
      setProfile(updatedProfile)
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, "Erro ao enviar a foto. Tente novamente."))
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  return {
    fields,
    updateField,
    avatarUrl,
    isSaving,
    isUploadingAvatar,
    error,
    isSaved: savedFeedback.value === true,
    save,
    changeAvatar,
  }
}

type ProfileForm = ReturnType<typeof useProfileForm>

interface ProfileSettingsSectionProps {
  profile: Profile
  form: ProfileForm
}

export function ProfileSettingsSection({ profile, form }: ProfileSettingsSectionProps) {
  const { fields, updateField } = form
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-6 text-lg font-bold text-level-purple-dark">Dados Pessoais</h2>

        <AvatarPicker
          avatarUrl={form.avatarUrl}
          altText={fields.fullName}
          initials={getInitials(profile.full_name)}
          isUploading={form.isUploadingAvatar}
          onPick={form.changeAvatar}
        />

        {form.error && (
          <div role="alert" className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-red-700">
            {form.error}
          </div>
        )}

        {form.isSaved && (
          <div role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Alterações salvas com sucesso!
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="settings-name" className={LABEL_CLASS}>Nome completo</label>
            <input
              id="settings-name"
              type="text"
              value={fields.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="settings-username" className={LABEL_CLASS}>Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <input
                id="settings-username"
                type="text"
                value={fields.username}
                onChange={(event) => updateField("username", event.target.value)}
                className="w-full rounded-xl border-2 border-border bg-white py-3 pl-8 pr-4 text-foreground transition-colors focus:border-level-purple focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="settings-bio" className={LABEL_CLASS}>Bio</label>
            <textarea
              id="settings-bio"
              value={fields.bio}
              onChange={(event) => updateField("bio", event.target.value)}
              rows={3}
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="settings-email" className={LABEL_CLASS}>Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="settings-email"
                type="email"
                value={profile.email}
                disabled
                className="w-full cursor-not-allowed rounded-xl border-2 border-border bg-muted py-3 pl-11 pr-4 text-muted-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
          </div>
        </div>

        <div className="mt-6">
          <LevelButton variant="primary" size="md" onClick={form.save} disabled={form.isSaving}>
            {form.isSaving ? (
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
  )
}

interface AvatarPickerProps {
  avatarUrl: string | null
  altText: string
  initials: string
  isUploading: boolean
  onPick: (file: File) => Promise<void>
}

function AvatarPicker({ avatarUrl, altText, initials, isUploading, onPick }: AvatarPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    await onPick(file)
    // Limpa a seleção para permitir escolher o mesmo arquivo de novo.
    input.value = ""
  }

  return (
    <div className="mb-6 flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-20 w-20 border-4 border-level-purple-light">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={altText} />}
          <AvatarFallback className="bg-level-purple-light text-xl font-bold text-level-purple-dark">{initials}</AvatarFallback>
        </Avatar>
        <input ref={fileInputRef} type="file" accept={ACCEPTED_AVATAR_TYPES} className="hidden" onChange={handleFileChange} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-level-purple text-white shadow-md transition-colors hover:bg-level-purple-dark disabled:opacity-60"
          title="Alterar foto"
          aria-label="Alterar foto de perfil"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </button>
      </div>
      <div>
        <p className="text-sm font-medium text-level-purple-dark">Foto de perfil</p>
        <p className="text-xs text-muted-foreground">JPG, PNG ou WebP. Máx. 2 MB.</p>
      </div>
    </div>
  )
}
