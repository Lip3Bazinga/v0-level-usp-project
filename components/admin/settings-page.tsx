"use client"

import { useState, useEffect } from "react"
import { Trophy, Globe, Flag, Lock, Settings, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { fetchPlatformSettings, savePlatformSettings, invalidateSessions, type PlatformSettings } from "@/lib/supabase/admin"

const FLAG_DEFS = [
  { key: "new_ide",            label: "Novo editor IDE",         desc: "Editor Monaco com auto-complete Python",     defaultOn: true  },
  { key: "peer_review",        label: "Revisão entre pares",     desc: "Alunos podem revisar código uns dos outros", defaultOn: false },
  { key: "ai_hints",           label: "Dicas com IA (Claude)",   desc: "Sugestões contextualizadas em lições",       defaultOn: true  },
  { key: "leaderboard_weekly", label: "Ranking semanal",         desc: "Reset do leaderboard toda segunda",          defaultOn: true  },
  { key: "streak_freeze",      label: "Streak freeze",           desc: "Usuários podem congelar streak por 1 dia",   defaultOn: false },
  { key: "dark_mode",          label: "Dark mode global",        desc: "Tema escuro em todas as páginas",            defaultOn: false },
]

const INTEGRATIONS = [
  { name: "Supabase",     desc: "Banco de dados e auth",       connected: true,  icon: "🗄️" },
  { name: "Google OAuth", desc: "Login com Google",            connected: true,  icon: "🔐" },
  { name: "GitHub OAuth", desc: "Login com GitHub",            connected: true,  icon: "⚡" },
  { name: "SendGrid",     desc: "Envio de emails",             connected: false, icon: "📧" },
  { name: "Discord",      desc: "Notificações",                connected: false, icon: "💬" },
  { name: "Pyodide",      desc: "Runtime Python no navegador", connected: true,  icon: "🐍" },
]

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn("relative h-6 w-11 rounded-full transition-colors", on ? "bg-success" : "bg-border")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-5" : "left-0.5")} />
    </button>
  )
}

function SettingRow({ label, hint, children, danger }: { label: string; hint: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-6 rounded-2xl border p-4 bg-white", danger ? "border-destructive/30" : "border-border")}>
      <div className="min-w-0">
        <p className={cn("text-sm font-bold", danger ? "text-destructive" : "text-level-purple-dark")}>{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <div className="w-56 shrink-0 flex justify-end">{children}</div>
    </div>
  )
}

interface SettingsPageProps {
  onToast: (msg: string, kind?: "success" | "danger" | "info") => void
}

export function SettingsPage({ onToast }: SettingsPageProps) {
  const [tab, setTab] = useState("general")
  const [saving, setSaving] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)

  const [platformName, setPlatformName]               = useState("LevelUSP")
  const [supportEmail, setSupportEmail]               = useState("suporte@levelusp.br")
  const [publicSignup, setPublicSignup]               = useState(true)
  const [requireEmailVerify, setRequireEmailVerify]   = useState(true)
  const [maintenanceMode, setMaintenanceMode]         = useState(false)
  const [xpPerLevel, setXpPerLevel]                   = useState("1000")
  const [streakMultiplier, setStreakMultiplier]       = useState("1.2")
  const [leaderboardEnabled, setLeaderboardEnabled]   = useState(true)
  const [badgesEnabled, setBadgesEnabled]             = useState(true)
  const [flags, setFlags] = useState(FLAG_DEFS.map((f) => ({ ...f, on: f.defaultOn })))
  // Segurança
  const [require2fa, setRequire2fa]                   = useState(false)
  const [sessionTimeout, setSessionTimeout]           = useState("60")
  const [rateLimit, setRateLimit]                     = useState("10")
  const [invalidating, setInvalidating]               = useState(false)

  useEffect(() => {
    fetchPlatformSettings()
      .then((s: PlatformSettings) => {
        if (s.platform_name)        setPlatformName(s.platform_name as string)
        if (s.support_email)        setSupportEmail(s.support_email as string)
        if (s.public_signup        !== undefined) setPublicSignup(Boolean(s.public_signup))
        if (s.require_email_verify !== undefined) setRequireEmailVerify(Boolean(s.require_email_verify))
        if (s.maintenance_mode     !== undefined) setMaintenanceMode(Boolean(s.maintenance_mode))
        if (s.xp_per_level)        setXpPerLevel(String(s.xp_per_level))
        if (s.streak_multiplier)   setStreakMultiplier(String(s.streak_multiplier))
        if (s.leaderboard_enabled  !== undefined) setLeaderboardEnabled(Boolean(s.leaderboard_enabled))
        if (s.badges_enabled       !== undefined) setBadgesEnabled(Boolean(s.badges_enabled))
        if (s.feature_flags && typeof s.feature_flags === "object") {
          const stored = s.feature_flags as Record<string, boolean>
          setFlags((prev) => prev.map((f) => (f.key in stored ? { ...f, on: stored[f.key] } : f)))
        }
        if (s.require_2fa     !== undefined) setRequire2fa(Boolean(s.require_2fa))
        if (s.session_timeout)  setSessionTimeout(String(s.session_timeout))
        if (s.rate_limit)       setRateLimit(String(s.rate_limit))
      })
      .catch(() => {})
      .finally(() => setLoadingSettings(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await savePlatformSettings({
        platform_name:        platformName,
        support_email:        supportEmail,
        public_signup:        publicSignup,
        require_email_verify: requireEmailVerify,
        maintenance_mode:     maintenanceMode,
        xp_per_level:         Number(xpPerLevel),
        streak_multiplier:    Number(streakMultiplier),
        leaderboard_enabled:  leaderboardEnabled,
        badges_enabled:       badgesEnabled,
        feature_flags:        Object.fromEntries(flags.map((f) => [f.key, f.on])),
        require_2fa:          require2fa,
        session_timeout:      Number(sessionTimeout),
        rate_limit:           Number(rateLimit),
      })
      onToast("Configurações salvas", "success")
    } catch {
      onToast("Erro ao salvar configurações", "danger")
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: "general",      label: "Geral",         Icon: Settings },
    { id: "gamification", label: "Gamificação",   Icon: Trophy },
    { id: "integrations", label: "Integrações",   Icon: Globe },
    { id: "flags",        label: "Feature flags", Icon: Flag },
    { id: "security",     label: "Segurança",     Icon: Lock },
  ]

  const inputClass = "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold focus:border-level-purple focus:outline-none"

  return (
    <div className="space-y-5 p-6">
      <div>
        <h2 className="text-xl font-extrabold text-level-purple-dark">Ajustes da plataforma</h2>
        <p className="text-sm text-muted-foreground">Configurações globais do LevelUSP</p>
      </div>

      <div className="flex items-center gap-0 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.Icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-bold transition-colors",
                tab === t.id
                  ? "border-level-purple text-level-purple"
                  : "border-transparent text-muted-foreground hover:text-level-purple",
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === "general" && (
        <div className="max-w-2xl space-y-4">
          {loadingSettings ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-level-purple" /></div>
          ) : (
            <>
              <SettingRow label="Nome da plataforma" hint="Exibido em emails e abas">
                <input value={platformName} onChange={(e) => setPlatformName(e.target.value)} className={inputClass} />
              </SettingRow>
              <SettingRow label="Email de suporte" hint="Usado para respostas automáticas">
                <input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className={inputClass} />
              </SettingRow>
              <SettingRow label="Permitir cadastro público" hint="Qualquer um pode criar conta">
                <Toggle on={publicSignup} onChange={setPublicSignup} />
              </SettingRow>
              <SettingRow label="Exigir verificação de email" hint="Bloqueia acesso até confirmar">
                <Toggle on={requireEmailVerify} onChange={setRequireEmailVerify} />
              </SettingRow>
              <SettingRow label="Modo manutenção" hint="Exibe tela de manutenção a todos (menos admins)" danger>
                <Toggle on={maintenanceMode} onChange={setMaintenanceMode} />
              </SettingRow>
            </>
          )}
        </div>
      )}

      {tab === "gamification" && (
        <div className="max-w-2xl space-y-4">
          {loadingSettings ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-level-purple" /></div>
          ) : (
            <>
              <SettingRow label="XP necessário por nível" hint="Régua progressiva. Atual: 1000 XP/nível">
                <input type="number" value={xpPerLevel} onChange={(e) => setXpPerLevel(e.target.value)} className={inputClass} />
              </SettingRow>
              <SettingRow label="Multiplicador de streak" hint="XP × este valor para cada dia consecutivo (após 3)">
                <input type="number" step="0.1" value={streakMultiplier} onChange={(e) => setStreakMultiplier(e.target.value)} className={inputClass} />
              </SettingRow>
              <SettingRow label="Habilitar leaderboard global" hint="Alunos veem ranking público">
                <Toggle on={leaderboardEnabled} onChange={setLeaderboardEnabled} />
              </SettingRow>
              <SettingRow label="Mostrar badges de conquistas" hint="Ícones de troféus no perfil">
                <Toggle on={badgesEnabled} onChange={setBadgesEnabled} />
              </SettingRow>
            </>
          )}
        </div>
      )}

      {tab === "integrations" && (
        <div className="grid max-w-3xl gap-3 md:grid-cols-2">
          {INTEGRATIONS.map((it) => (
            <div key={it.name} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-xl">{it.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-level-purple-dark">{it.name}</p>
                <p className="text-[11px] text-muted-foreground">{it.desc}</p>
              </div>
              {it.connected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-bold text-success">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Conectado
                </span>
              ) : (
                <button className="rounded-lg bg-level-purple px-3 py-1.5 text-xs font-bold text-white">Conectar</button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "flags" && (
        <div className="max-w-2xl space-y-3">
          {flags.map((f) => (
            <div key={f.key} className="flex items-center justify-between rounded-2xl border border-border bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-level-purple-dark">{f.label}</p>
                <p className="text-[11px] text-muted-foreground">{f.desc}</p>
              </div>
              <Toggle
                on={f.on}
                onChange={(v) => setFlags((prev) => prev.map((x) => (x.key === f.key ? { ...x, on: v } : x)))}
              />
            </div>
          ))}
        </div>
      )}

      {tab === "security" && (
        <div className="max-w-2xl space-y-4">
          <SettingRow label="2FA obrigatório para admins" hint="Exige autenticação de dois fatores">
            <Toggle on={require2fa} onChange={setRequire2fa} />
          </SettingRow>
          <SettingRow label="Tempo de sessão (minutos)" hint="Logout automático após inatividade">
            <input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} className={inputClass} />
          </SettingRow>
          <SettingRow label="Rate limit · submissões/min" hint="Por usuário, por endpoint">
            <input type="number" value={rateLimit} onChange={(e) => setRateLimit(e.target.value)} className={inputClass} />
          </SettingRow>
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <p className="mb-1 text-sm font-extrabold text-destructive">Zona de perigo</p>
            <p className="mb-4 text-xs text-muted-foreground">Ações que afetam toda a plataforma.</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!window.confirm("Invalidar TODAS as sessões? Todos os usuários precisarão logar novamente.")) return
                  setInvalidating(true)
                  try {
                    await invalidateSessions()
                    onToast("Todas as sessões foram invalidadas", "success")
                  } catch (e) {
                    onToast(e instanceof Error ? e.message : "Erro ao invalidar sessões", "danger")
                  } finally {
                    setInvalidating(false)
                  }
                }}
                disabled={invalidating}
                className="flex items-center gap-2 rounded-xl border border-destructive bg-white px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive hover:text-white disabled:opacity-50"
              >
                {invalidating && <Loader2 className="h-4 w-4 animate-spin" />}
                Invalidar todas as sessões
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 -mx-6 flex items-center justify-between border-t border-border bg-white/90 px-6 py-4 backdrop-blur">
        <p className="text-xs text-muted-foreground">Alterações são registradas no log de auditoria</p>
        <button
          onClick={handleSave}
          disabled={saving || loadingSettings}
          className="btn-3d flex items-center gap-2 rounded-xl bg-level-purple px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  )
}
