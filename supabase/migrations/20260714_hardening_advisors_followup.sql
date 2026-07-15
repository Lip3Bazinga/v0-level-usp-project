-- Correções apontadas pelos security advisors (aplicada em 2026-07-14):
-- 1. update_notes_updated_at sem search_path fixo
-- 2. handle_new_user (função de trigger) exposta como RPC para anon/authenticated

create or replace function public.update_notes_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end;
$$;

revoke execute on function public.handle_new_user() from anon, authenticated;
