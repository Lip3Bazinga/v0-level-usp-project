-- Buckets publicos tinham policy de SELECT ampla em storage.objects, o que
-- permite LISTAR todos os arquivos do bucket. O acesso por URL publica
-- (/storage/v1/object/public/...) nao passa por RLS, entao essa policy nao e
-- necessaria para exibir imagens. O codigo so usa upload + getPublicUrl:
-- nenhum .list() ou .download(). Ver docs/10-auditoria-2026-08-03.md, item 7.

DROP POLICY IF EXISTS "course_covers_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars public read" ON storage.objects;

-- Mantem leitura autenticada apenas para quem administra o proprio arquivo,
-- preservando operacoes futuras de gestao sem reabrir a listagem geral.
CREATE POLICY "course_covers_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'course-covers'
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.created_by = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "avatars_owner_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );
