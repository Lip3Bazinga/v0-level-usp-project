import { describe, expect, it } from "vitest"
import { DEFAULT_SETTINGS_FORM, parseSettingsForm, toPlatformSettings } from "./platform-settings"

describe("ajustes da plataforma", () => {
  it("sem nada salvo usa os padrões", () => {
    expect(parseSettingsForm({})).toEqual(DEFAULT_SETTINGS_FORM)
  })

  it("lê os valores salvos e só as flags conhecidas", () => {
    const form = parseSettingsForm({
      platform_name: "Outro",
      maintenance_mode: true,
      public_signup: false,
      xp_per_level: 1500,
      feature_flags: { dark_mode: true, flag_desconhecida: true },
    })
    expect(form.platformName).toBe("Outro")
    expect(form.maintenanceMode).toBe(true)
    expect(form.publicSignup).toBe(false)
    expect(form.xpPerLevel).toBe("1500")
    expect(form.featureFlags.dark_mode).toBe(true)
    expect(form.featureFlags).not.toHaveProperty("flag_desconhecida")
  })

  it("ignora feature_flags que não é objeto", () => {
    expect(parseSettingsForm({ feature_flags: "x" }).featureFlags).toEqual(DEFAULT_SETTINGS_FORM.featureFlags)
  })

  it("converte os campos numéricos ao salvar", () => {
    const settings = toPlatformSettings({ ...DEFAULT_SETTINGS_FORM, streakMultiplier: "1.5", rateLimit: "20" })
    expect(settings.streak_multiplier).toBe(1.5)
    expect(settings.rate_limit).toBe(20)
    expect(settings.feature_flags).toEqual(DEFAULT_SETTINGS_FORM.featureFlags)
  })
})
