-- log_audit era SECURITY DEFINER sem nenhuma checagem de autorizacao e exposta
-- a anon/authenticated via /rest/v1/rpc/log_audit. Qualquer um podia forjar
-- entradas de auditoria com actor_id/actor_name arbitrarios, inclusive se
-- passando pelo admin. Ver docs/10-auditoria-2026-08-03.md, item 2.

CREATE OR REPLACE FUNCTION public.log_audit(
  p_actor_id  uuid,
  p_actor_name text,
  p_action    text,
  p_target    text,
  p_meta      jsonb DEFAULT '{}'::jsonb,
  p_severity  text  DEFAULT 'info'::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Chamadas server-side usam service role, onde auth.uid() e nulo: permitidas.
  -- Chamadas vindas do browser so podem registrar em nome do proprio usuario.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_actor_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  INSERT INTO public.audit_log (actor_id, actor_name, action, target, meta, severity)
  VALUES (p_actor_id, p_actor_name, p_action, p_target, p_meta, p_severity);
END;
$function$;

-- Visitante nao autenticado nunca precisa escrever auditoria.
REVOKE EXECUTE ON FUNCTION public.log_audit(uuid, text, text, text, jsonb, text) FROM anon;
