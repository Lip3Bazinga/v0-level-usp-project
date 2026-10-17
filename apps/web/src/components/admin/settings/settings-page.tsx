"use client"

import { useState, type ReactNode } from "react"
import { Flag, Globe, Loader2, Lock, Settings, Trophy } from "lucide-react"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchPlatformSettings, getErrorMessage, invalidateSessions, savePlatformSettings } from "@/lib/api"
import type { OnToast } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  DEFAULT_SETTINGS_FORM, FEATURE_FLAG_DETAILS, FEATURE_FLAG_KEYS, parseSettingsForm, toPlatformSettings, type PlatformSettingsForm,
} from "./platform-settings"

const SETTINGS_TABS = [
  { id: "general", label: "Geral", icon: Settings },
  { id: "gamification", label: "Gamificação", icon: Trophy },
  { id: "integrations", label: "Integrações", icon: Globe },
  { id: "flags", label: "Feature flags", icon: Flag },
  { id: "security", label: "Segurança", icon: Lock },
] as const

type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"]

const INTEGRATIONS = [
  { name: "API LevelUSP", description: "Regras de negócio, autenticação e correção", isConnected: true, icon: "🛡️" },
  { name: "PostgreSQL", description: "Banco de dados", isConnected: true, icon: "🗄️" },
  { name: "Executor Python", description: "CPython isolado (WASI) para correção", isConnected: true, icon: "🐍" },
  { name: "Pyodide", description: "Runtime Python no navegador (IDE)", isConnected: true, icon: "🧪" },
  { name: "E-mail (SMTP)", description: "Redefinição de senha e convites", isConnected: false, icon: "📧" },
  { name: "Discord", description: "Notificações", isConnected: false, icon: "💬" },
]

const INPUT_CLASS = "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold focus:border-level-purple focus:outline-none"

type PatchSettings = (changes: Partial<PlatformSettingsForm>) => void

interface SettingsPageProps {
  onToast: OnToast
}

export function SettingsPage({ onToast }: SettingsPageProps) {
  const [tab, setTab] = useState<SettingsTabId>("general")
  const settings = useAsyncResource(() => fetchPlatformSettings(), [], {
    errorMessage: "Não foi possível carregar as configurações.",
  })
  const [edits, setEdits] = useState<PlatformSettingsForm | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isInvalidating, setIsInvalidating] = useState(false)

  const isLoading = settings.status === "loading"
  const form = edits ?? (settings.status === "success" ? parseSettingsForm(settings.data) : DEFAULT_SETTINGS_FORM)
  const patch: PatchSettings = (changes) => setEdits({ ...form, ...changes })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await savePlatformSettings(toPlatformSettings(form))
      onToast("Configurações salvas", "success")
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao salvar configurações"), "danger")
    } finally {
      setIsSaving(false)
    }
  }

  const handleInvalidateSessions = async () => {
    if (!window.confirm("Invalidar TODAS as sessões? Todos os usuários precisarão logar novamente.")) return
    setIsInvalidating(true)
    try {
      await invalidateSessions()
      onToast("Todas as sessões foram invalidadas", "success")
    } catch (error) {
      onToast(getErrorMessage(error, "Erro ao invalidar sessões"), "danger")
    } finally {
      setIsInvalidating(false)
    }
  }

  return (
    <div className="space-y-5 p-6">
      <div>
        <h2 className="text-xl font-extrabold text-level-purple-dark">Ajustes da plataforma</h2>
        <p className="text-sm text-muted-foreground">Configurações globais do LevelUSP</p>
      </div>

      {settings.status === "error" && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{settings.error}</p>
      )}

      <div className="flex items-center gap-0 border-b border-border">
        {SETTINGS_TABS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors",
                tab === item.id ? "border-level-purple text-level-purple" : "border-transparent text-muted-foreground hover:text-level-purple",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {item.label}
            </button>
          )
        })}
      </div>

      {tab === "general" && (
        <div className="max-w-2xl space-y-4">
          {isLoading ? <SectionSpinner /> : <GeneralSettings form={form} patch={patch} />}
        </div>
      )}

      {tab === "gamification" && (
        <div className="max-w-2xl space-y-4">
          {isLoading ? <SectionSpinner /> : <GamificationSettings form={form} patch={patch} />}
        </div>
      )}

      {tab === "integrations" && <IntegrationsList />}

      {tab === "flags" && <FeatureFlagsList form={form} patch={patch} />}

      {tab === "security" && (
        <SecuritySettings form={form} patch={patch} isInvalidating={isInvalidating} onInvalidateSessions={handleInvalidateSessions} />
      )}

      <div className="sticky bottom-0 -mx-6 flex items-center justify-between border-t border-border bg-white/90 px-6 py-4 backdrop-blur">
        <p className="text-xs text-muted-foreground">Alterações são registradas no log de auditoria</p>
        <button
          onClick={handleSave}
          disabled={isSaving || settings.status !== "success"}
          className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  )
}

interface SettingsSectionProps {
  form: PlatformSettingsForm
  patch: PatchSettings
}

function GeneralSettings({ form, patch }: SettingsSectionProps) {
  return (
    <>
      <SettingRow label="Nome da plataforma" hint="Exibido em emails e abas">
        <input value={form.platformName} onChange={(event) => patch({ platformName: event.target.value })} className={INPUT_CLASS} />
      </SettingRow>
      <SettingRow label="Email de suporte" hint="Usado para respostas automáticas">
        <input value={form.supportEmail} onChange={(event) => patch({ supportEmail: event.target.value })} className={INPUT_CLASS} />
      </SettingRow>
      <SettingRow label="Permitir cadastro público" hint="Qualquer um pode criar conta">
        <Toggle isOn={form.publicSignup} onChange={(publicSignup) => patch({ publicSignup })} />
      </SettingRow>
      <SettingRow label="Exigir verificação de email" hint="Bloqueia acesso até confirmar">
        <Toggle isOn={form.requireEmailVerify} onChange={(requireEmailVerify) => patch({ requireEmailVerify })} />
      </SettingRow>
      <SettingRow label="Modo manutenção" hint="Exibe tela de manutenção a todos (menos admins)" isDanger>
        <Toggle isOn={form.maintenanceMode} onChange={(maintenanceMode) => patch({ maintenanceMode })} />
      </SettingRow>
    </>
  )
}

function GamificationSettings({ form, patch }: SettingsSectionProps) {
  return (
    <>
      <SettingRow label="XP necessário por nível" hint="Régua progressiva. Atual: 1000 XP/nível">
        <input type="number" value={form.xpPerLevel} onChange={(event) => patch({ xpPerLevel: event.target.value })} className={INPUT_CLASS} />
      </SettingRow>
      <SettingRow label="Multiplicador de sequência" hint="XP × este valor para cada dia consecutivo (após 3)">
        <input
          type="number"
          step="0.1"
          value={form.streakMultiplier}
          onChange={(event) => patch({ streakMultiplier: event.target.value })}
          className={INPUT_CLASS}
        />
      </SettingRow>
      <SettingRow label="Habilitar leaderboard global" hint="Alunos veem ranking público">
        <Toggle isOn={form.leaderboardEnabled} onChange={(leaderboardEnabled) => patch({ leaderboardEnabled })} />
      </SettingRow>
      <SettingRow label="Mostrar badges de conquistas" hint="Ícones de troféus no perfil">
        <Toggle isOn={form.badgesEnabled} onChange={(badgesEnabled) => patch({ badgesEnabled })} />
      </SettingRow>
    </>
  )
}

function IntegrationsList() {
  return (
    <div className="grid max-w-3xl gap-3 md:grid-cols-2">
      {INTEGRATIONS.map((integration) => (
        <div key={integration.name} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-xl">{integration.icon}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-level-purple-dark">{integration.name}</p>
            <p className="text-[11px] text-muted-foreground">{integration.description}</p>
          </div>
          {integration.isConnected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Conectado
            </span>
          ) : (
            <button className="rounded-lg bg-level-purple px-3 py-1.5 text-xs font-bold text-white">Conectar</button>
          )}
        </div>
      ))}
    </div>
  )
}

function FeatureFlagsList({ form, patch }: SettingsSectionProps) {
  return (
    <div className="max-w-2xl space-y-3">
      {FEATURE_FLAG_KEYS.map((key) => {
        const { label, description } = FEATURE_FLAG_DETAILS[key]
        return (
          <div key={key} className="flex items-center justify-between rounded-2xl border border-border bg-white p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-level-purple-dark">{label}</p>
              <p className="text-[11px] text-muted-foreground">{description}</p>
            </div>
            <Toggle
              label={label}
              isOn={form.featureFlags[key]}
              onChange={(isOn) => patch({ featureFlags: { ...form.featureFlags, [key]: isOn } })}
            />
          </div>
        )
      })}
    </div>
  )
}

interface SecuritySettingsProps extends SettingsSectionProps {
  isInvalidating: boolean
  onInvalidateSessions: () => void
}

function SecuritySettings({ form, patch, isInvalidating, onInvalidateSessions }: SecuritySettingsProps) {
  return (
    <div className="max-w-2xl space-y-4">
      <SettingRow label="2FA obrigatório para admins" hint="Exige autenticação de dois fatores">
        <Toggle isOn={form.require2fa} onChange={(require2fa) => patch({ require2fa })} />
      </SettingRow>
      <SettingRow label="Tempo de sessão (minutos)" hint="Logout automático após inatividade">
        <input type="number" value={form.sessionTimeout} onChange={(event) => patch({ sessionTimeout: event.target.value })} className={INPUT_CLASS} />
      </SettingRow>
      <SettingRow label="Rate limit · submissões/min" hint="Por usuário, por endpoint">
        <input type="number" value={form.rateLimit} onChange={(event) => patch({ rateLimit: event.target.value })} className={INPUT_CLASS} />
      </SettingRow>
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="mb-1 text-sm font-extrabold text-destructive">Zona de perigo</p>
        <p className="mb-4 text-xs text-muted-foreground">Ações que afetam toda a plataforma.</p>
        <div className="flex gap-2">
          <button
            onClick={onInvalidateSessions}
            disabled={isInvalidating}
            className="flex items-center gap-2 rounded-xl border border-destructive bg-white px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive hover:text-white disabled:opacity-50"
          >
            {isInvalidating && <Loader2 className="h-4 w-4 animate-spin" />}
            Invalidar todas as sessões
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionSpinner() {
  return (
    <div className="flex justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-level-purple" />
    </div>
  )
}

interface ToggleProps {
  isOn: boolean
  onChange: (isOn: boolean) => void
  label?: string
}

function Toggle({ isOn, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={label}
      onClick={() => onChange(!isOn)}
      className={cn("relative h-6 w-11 rounded-full transition-colors", isOn ? "bg-success" : "bg-border")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", isOn ? "left-5" : "left-0.5")} />
    </button>
  )
}

interface SettingRowProps {
  label: string
  hint: string
  isDanger?: boolean
  children: ReactNode
}

/** Linha rotulada; o `<label>` envolve o controle para que leitores de tela anunciem o nome do ajuste. */
function SettingRow({ label, hint, isDanger, children }: SettingRowProps) {
  return (
    <label
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 bg-white sm:flex-nowrap sm:gap-6",
        isDanger ? "border-destructive/30" : "border-border",
      )}
    >
      <span className="block min-w-0">
        <span className={cn("block text-sm font-bold", isDanger ? "text-destructive" : "text-level-purple-dark")}>{label}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>
      </span>
      <span className="flex w-full shrink-0 justify-end sm:w-56">{children}</span>
    </label>
  )
}
