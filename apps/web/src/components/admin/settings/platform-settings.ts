import type { PlatformSettings } from "@levelusp/contracts"

export const FEATURE_FLAG_KEYS = ["new_ide", "peer_review", "ai_hints", "leaderboard_weekly", "streak_freeze", "dark_mode"] as const

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number]

export const FEATURE_FLAG_DETAILS: Record<FeatureFlagKey, { label: string; description: string }> = {
  new_ide: { label: "Novo editor IDE", description: "Editor Monaco com auto-complete Python" },
  peer_review: { label: "Revisão entre pares", description: "Alunos podem revisar código uns dos outros" },
  ai_hints: { label: "Dicas com IA (Claude)", description: "Sugestões contextualizadas em lições" },
  leaderboard_weekly: { label: "Ranking semanal", description: "Reset do leaderboard toda segunda" },
  streak_freeze: { label: "Congelar sequência", description: "Usuários podem congelar a sequência por 1 dia" },
  dark_mode: { label: "Dark mode global", description: "Tema escuro em todas as páginas" },
}

const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  new_ide: true,
  peer_review: false,
  ai_hints: true,
  leaderboard_weekly: true,
  streak_freeze: false,
  dark_mode: false,
}

/**
 * Estado editável da tela de ajustes. Campos numéricos ficam como texto enquanto o
 * admin digita e só viram número ao salvar.
 */
export interface PlatformSettingsForm {
  platformName: string
  supportEmail: string
  publicSignup: boolean
  requireEmailVerify: boolean
  maintenanceMode: boolean
  xpPerLevel: string
  streakMultiplier: string
  leaderboardEnabled: boolean
  badgesEnabled: boolean
  featureFlags: Record<FeatureFlagKey, boolean>
  require2fa: boolean
  sessionTimeout: string
  rateLimit: string
}

export const DEFAULT_SETTINGS_FORM: PlatformSettingsForm = {
  platformName: "LevelUSP",
  supportEmail: "suporte@levelusp.br",
  publicSignup: true,
  requireEmailVerify: true,
  maintenanceMode: false,
  xpPerLevel: "1000",
  streakMultiplier: "1.2",
  leaderboardEnabled: true,
  badgesEnabled: true,
  featureFlags: DEFAULT_FEATURE_FLAGS,
  require2fa: false,
  sessionTimeout: "60",
  rateLimit: "10",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Texto salvo, ou o padrão quando a chave falta ou está vazia. */
function readText(settings: PlatformSettings, key: string, fallback: string): string {
  const value = settings[key]
  return value ? String(value) : fallback
}

function readFlag(settings: PlatformSettings, key: string, fallback: boolean): boolean {
  const value = settings[key]
  return value === undefined ? fallback : Boolean(value)
}

function readFeatureFlags(stored: unknown): Record<FeatureFlagKey, boolean> {
  const flags = { ...DEFAULT_FEATURE_FLAGS }
  if (!isRecord(stored)) return flags
  for (const key of FEATURE_FLAG_KEYS) {
    if (Object.hasOwn(stored, key)) flags[key] = Boolean(stored[key])
  }
  return flags
}

/** Preenche o formulário com o que está salvo; chaves ausentes ficam com o padrão. */
export function parseSettingsForm(settings: PlatformSettings): PlatformSettingsForm {
  const defaults = DEFAULT_SETTINGS_FORM
  return {
    platformName: readText(settings, "platform_name", defaults.platformName),
    supportEmail: readText(settings, "support_email", defaults.supportEmail),
    publicSignup: readFlag(settings, "public_signup", defaults.publicSignup),
    requireEmailVerify: readFlag(settings, "require_email_verify", defaults.requireEmailVerify),
    maintenanceMode: readFlag(settings, "maintenance_mode", defaults.maintenanceMode),
    xpPerLevel: readText(settings, "xp_per_level", defaults.xpPerLevel),
    streakMultiplier: readText(settings, "streak_multiplier", defaults.streakMultiplier),
    leaderboardEnabled: readFlag(settings, "leaderboard_enabled", defaults.leaderboardEnabled),
    badgesEnabled: readFlag(settings, "badges_enabled", defaults.badgesEnabled),
    featureFlags: readFeatureFlags(settings.feature_flags),
    require2fa: readFlag(settings, "require_2fa", defaults.require2fa),
    sessionTimeout: readText(settings, "session_timeout", defaults.sessionTimeout),
    rateLimit: readText(settings, "rate_limit", defaults.rateLimit),
  }
}

/** Corpo do `PUT /admin/settings`, nas chaves snake_case gravadas pela API. */
export function toPlatformSettings(form: PlatformSettingsForm): PlatformSettings {
  return {
    platform_name: form.platformName,
    support_email: form.supportEmail,
    public_signup: form.publicSignup,
    require_email_verify: form.requireEmailVerify,
    maintenance_mode: form.maintenanceMode,
    xp_per_level: Number(form.xpPerLevel),
    streak_multiplier: Number(form.streakMultiplier),
    leaderboard_enabled: form.leaderboardEnabled,
    badges_enabled: form.badgesEnabled,
    feature_flags: { ...form.featureFlags },
    require_2fa: form.require2fa,
    session_timeout: Number(form.sessionTimeout),
    rate_limit: Number(form.rateLimit),
  }
}
