-- Corrige 403 na criação de curso com capa: o upload usa upsert=true, que exige
-- política de UPDATE no storage (inexistente até aqui); também corrige o DELETE
-- que comparava a pasta (courseId) com auth.uid() e nunca casava.
-- Aplicada no banco ao vivo em 2026-07-14 (fix_course_covers_storage_policies).

drop policy if exists "course_covers_upload" on storage.objects;
drop policy if exists "course_covers_owner_manage" on storage.objects;

create policy "course_covers_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'course-covers'
    and exists (
      select 1 from public.courses c
      where c.id::text = (storage.foldername(name))[1]
        and (c.created_by = auth.uid()
             or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );

create policy "course_covers_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'course-covers'
    and exists (
      select 1 from public.courses c
      where c.id::text = (storage.foldername(name))[1]
        and (c.created_by = auth.uid()
             or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  )
  with check (
    bucket_id = 'course-covers'
    and exists (
      select 1 from public.courses c
      where c.id::text = (storage.foldername(name))[1]
        and (c.created_by = auth.uid()
             or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );

create policy "course_covers_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'course-covers'
    and exists (
      select 1 from public.courses c
      where c.id::text = (storage.foldername(name))[1]
        and (c.created_by = auth.uid()
             or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    )
  );
