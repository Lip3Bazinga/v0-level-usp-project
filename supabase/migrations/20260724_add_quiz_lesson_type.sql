-- Lição do tipo "quiz": questionário de múltipla escolha no lugar de teoria/prática.
-- Segue o MESMO modelo de segurança da prova final: o gabarito (correct_index)
-- vive numa tabela com RLS deny-all e só é lido pelo service role na correção.
-- Aplicada no banco ao vivo em 2026-07-24 (add_quiz_lesson_type).

-- 1. Novo valor no enum textual de lesson_type
alter table public.lessons drop constraint if exists lessons_lesson_type_check;
alter table public.lessons add constraint lessons_lesson_type_check
  check (lesson_type in ('coding', 'theory', 'quiz'));

-- 2. Nota mínima para concluir a lição-quiz (default 70%)
alter table public.lessons
  add column if not exists quiz_passing_score integer not null default 70
  check (quiz_passing_score between 1 and 100);

-- 3. Questões do quiz — gabarito INACESSÍVEL ao cliente (RLS deny-all + revoke),
--    idêntico ao tratamento de exam_questions.
create table if not exists public.lesson_quiz_questions (
  id            uuid        primary key default gen_random_uuid(),
  lesson_id     uuid        not null references public.lessons(id) on delete cascade,
  prompt        text        not null,
  options       jsonb       not null default '[]',
  correct_index integer     not null check (correct_index >= 0),
  explanation   text        not null default '',
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists lesson_quiz_questions_lesson_idx
  on public.lesson_quiz_questions (lesson_id, sort_order);

alter table public.lesson_quiz_questions enable row level security;
revoke all on public.lesson_quiz_questions from anon, authenticated;

-- 4. RPC para o PROFESSOR/ADMIN dono da lição ler as questões COM gabarito
--    (mesmo padrão de get_lesson_hidden_tests).
create or replace function public.get_lesson_quiz_questions(p_lesson_id uuid)
returns table (
  id uuid, prompt text, options jsonb, correct_index integer,
  explanation text, sort_order integer
)
language sql stable security definer set search_path = public, pg_temp as $$
  select q.id, q.prompt, q.options, q.correct_index, q.explanation, q.sort_order
  from public.lesson_quiz_questions q
  join public.lessons l on l.id = q.lesson_id
  where q.lesson_id = p_lesson_id
    and (public.is_admin() or l.created_by = auth.uid())
  order by q.sort_order;
$$;

revoke execute on function public.get_lesson_quiz_questions(uuid) from anon;
grant execute on function public.get_lesson_quiz_questions(uuid) to authenticated;

-- 5. RPC para o professor/admin SUBSTITUIR as questões da lição (transacional).
create or replace function public.replace_lesson_quiz_questions(
  p_lesson_id uuid,
  p_questions jsonb
)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  _owner uuid;
  _item  jsonb;
  _i     integer := 0;
begin
  select created_by into _owner from public.lessons where id = p_lesson_id;
  if _owner is null then
    raise exception 'lesson_not_found';
  end if;
  if not (public.is_admin() or _owner = auth.uid()) then
    raise exception 'not_authorized';
  end if;

  delete from public.lesson_quiz_questions where lesson_id = p_lesson_id;

  for _item in select * from jsonb_array_elements(p_questions) loop
    insert into public.lesson_quiz_questions
      (lesson_id, prompt, options, correct_index, explanation, sort_order)
    values (
      p_lesson_id,
      _item->>'prompt',
      coalesce(_item->'options', '[]'::jsonb),
      coalesce((_item->>'correct_index')::int, 0),
      coalesce(_item->>'explanation', ''),
      _i
    );
    _i := _i + 1;
  end loop;
end;
$$;

revoke execute on function public.replace_lesson_quiz_questions(uuid, jsonb) from anon;
grant execute on function public.replace_lesson_quiz_questions(uuid, jsonb) to authenticated;

-- 6. Grant de leitura da nova coluna pública (grants por coluna em lessons)
grant select (quiz_passing_score) on public.lessons to anon, authenticated;
