-- Prova final teórica + certificação.
-- Segurança: exam_questions NÃO tem nenhuma policy para clientes (deny-all via RLS)
-- — o gabarito (correct_index) só é lido pelo service role em /api/exam/*.
-- exam_attempts: cliente só LÊ as próprias tentativas; escrita só via service role.
-- Aplicada no banco ao vivo em 2026-07-14 (create_exams_and_certificates).

create table if not exists public.exams (
  id                 uuid        primary key default gen_random_uuid(),
  course_id          uuid        not null unique references public.courses(id) on delete cascade,
  title              text        not null,
  description        text        not null default '',
  passing_score      integer     not null default 70 check (passing_score between 1 and 100),
  time_limit_minutes integer     not null default 45 check (time_limit_minutes > 0),
  cooldown_minutes   integer     not null default 60 check (cooldown_minutes >= 0),
  active             boolean     not null default true,
  created_at         timestamptz not null default now()
);

alter table public.exams enable row level security;

create policy "exams_public_read" on public.exams
  for select using (active = true);

create policy "exams_admin_all" on public.exams
  for all using (is_admin());

create table if not exists public.exam_questions (
  id            uuid        primary key default gen_random_uuid(),
  exam_id       uuid        not null references public.exams(id) on delete cascade,
  prompt        text        not null,
  options       jsonb       not null default '[]',
  correct_index integer     not null check (correct_index >= 0),
  explanation   text        not null default '',
  topic         text        not null default '',
  sort_order    integer     not null default 0,
  active        boolean     not null default true,
  created_at    timestamptz not null default now()
);

-- RLS ligada e SEM policies para anon/authenticated: deny-all no cliente.
-- Mesma proteção de hidden_tests: o gabarito nunca sai do servidor.
alter table public.exam_questions enable row level security;
revoke all on public.exam_questions from anon, authenticated;

create table if not exists public.exam_attempts (
  id           uuid        primary key default gen_random_uuid(),
  exam_id      uuid        not null references public.exams(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  question_ids uuid[]      not null default '{}',
  answers      jsonb       not null default '{}',
  score        numeric(5,2),
  passed       boolean,
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.exam_attempts enable row level security;

-- Cliente só lê as próprias tentativas; INSERT/UPDATE apenas via service role
-- (impede forjar score/passed do lado do cliente).
create policy "exam_attempts_select_own" on public.exam_attempts
  for select using (auth.uid() = user_id);

create index if not exists exam_attempts_user_exam_idx
  on public.exam_attempts (user_id, exam_id, started_at desc);

create table if not exists public.certificates (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.profiles(id) on delete cascade,
  course_id         uuid        not null references public.courses(id) on delete cascade,
  verification_code text        not null unique,
  exam_score        numeric(5,2),
  project_status    text        not null default 'passed'
                    check (project_status in ('passed', 'waived')),
  issued_at         timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table public.certificates enable row level security;

-- Cliente lê o próprio certificado; emissão apenas via service role.
create policy "certificates_select_own" on public.certificates
  for select using (auth.uid() = user_id);

-- Verificação pública (sem login) por código — expõe apenas o necessário.
create or replace function public.verify_certificate(p_code text)
returns table (
  student_name text,
  course_title text,
  issued_at    timestamptz,
  exam_score   numeric
)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.full_name, c.title, cert.issued_at, cert.exam_score
  from public.certificates cert
  join public.profiles p on p.id = cert.user_id
  join public.courses  c on c.id = cert.course_id
  where cert.verification_code = upper(trim(p_code));
$$;

grant execute on function public.verify_certificate(text) to anon, authenticated;
