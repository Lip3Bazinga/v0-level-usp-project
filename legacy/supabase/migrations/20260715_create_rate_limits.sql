-- Rate limiting por usuário (janela deslizante).
-- Cada linha registra UMA ocorrência de uma ação (ex.: "evaluate", "exam_start").
-- Os endpoints contam as linhas do usuário dentro da janela e bloqueiam ao
-- atingir o limite. Escrita e leitura acontecem SOMENTE via service role
-- (rota Next.js /api/exam/*/start e função Python api/evaluate.py).
-- Segurança: RLS habilitado SEM nenhuma policy = deny-all para anon e
-- authenticated — clientes não conseguem ler, inserir nem apagar registros
-- para burlar o limite. O service role ignora RLS por definição.

create table if not exists public.rate_limits (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null,
  action     text        not null,
  created_at timestamptz not null default now()
);

-- Índice para a consulta quente: "quantas ações X o usuário fez desde T?"
create index if not exists rate_limits_user_action_created_idx
  on public.rate_limits (user_id, action, created_at desc);

-- Deny-all: RLS ligado e nenhuma policy criada de propósito.
alter table public.rate_limits enable row level security;
