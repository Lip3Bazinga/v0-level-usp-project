-- Alinha o banco à UI: só professores e admins podem criar cursos
-- (antes qualquer usuário autenticado podia inserir via API direta).
-- Aplicada no banco ao vivo em 2026-07-14 (restrict_course_insert_to_teachers).

drop policy if exists "courses_insert_own" on public.courses;

create policy "courses_insert_own" on public.courses
  for insert to authenticated
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('teacher', 'admin')
    )
  );
