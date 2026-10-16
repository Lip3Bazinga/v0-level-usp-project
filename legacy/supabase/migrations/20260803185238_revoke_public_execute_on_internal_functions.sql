-- Funcoes em Postgres recebem EXECUTE para PUBLIC por padrao, entao um
-- REVOKE ... FROM anon nao surte efeito: anon herda de PUBLIC. Aqui revogamos
-- de PUBLIC e concedemos explicitamente so a quem precisa.

-- log_audit: escrita de auditoria e feita por rotas server-side com service
-- role. Nenhum caminho do browser precisa chamar (o wrapper client-side em
-- lib/supabase/admin.ts nao tem chamadores).
REVOKE ALL ON FUNCTION public.log_audit(uuid, text, text, text, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_audit(uuid, text, text, text, jsonb, text) FROM anon;
REVOKE ALL ON FUNCTION public.log_audit(uuid, text, text, text, jsonb, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit(uuid, text, text, text, jsonb, text) TO service_role;

-- handle_new_user: e uma funcao de TRIGGER. Nao deve ser invocavel via
-- /rest/v1/rpc por ninguem.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

-- Funcoes de escrita que so fazem sentido para usuario autenticado.
-- (Cada uma ja valida autorizacao internamente; isto reduz a superficie.)
REVOKE ALL ON FUNCTION public.award_xp(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_xp(uuid, uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.grant_badges(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_badges(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.grant_badges(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reorder_lessons(uuid, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reorder_lessons(uuid, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.reorder_lessons(uuid, uuid[]) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.replace_lesson_quiz_questions(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_lesson_quiz_questions(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.replace_lesson_quiz_questions(uuid, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_lesson_quiz_questions(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lesson_quiz_questions(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_lesson_quiz_questions(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_lesson_hidden_tests(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lesson_hidden_tests(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_lesson_hidden_tests(uuid) TO authenticated, service_role;

-- verify_certificate CONTINUA aberta a anon de proposito: a pagina publica
-- /certificado/[code] valida certificados sem exigir login.
