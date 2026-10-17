-- Tabela de configurações globais da plataforma (admin only)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL DEFAULT 'null',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read platform_settings"
  ON public.platform_settings FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can upsert platform_settings"
  ON public.platform_settings FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update platform_settings"
  ON public.platform_settings FOR UPDATE USING (public.is_admin());

CREATE TRIGGER set_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
