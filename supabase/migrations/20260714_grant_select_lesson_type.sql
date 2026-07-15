-- lesson_type foi adicionada depois do hardening de grants por coluna e ficou
-- sem SELECT para anon/authenticated — o PUBLIC_LESSON_FIELDS do cliente inclui
-- lesson_type, então toda leitura de lições falhava com permission denied.
-- Aplicada no banco ao vivo em 2026-07-14 (grant_select_lesson_type).

grant select (lesson_type) on public.lessons to anon, authenticated;
