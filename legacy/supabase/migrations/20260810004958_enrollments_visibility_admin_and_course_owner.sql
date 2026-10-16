-- enrollments so tinha policies *_own: admin via 1 matricula em vez de 25 e o
-- professor nao enxergava quem estava matriculado no proprio curso.
-- Aditivo: policies permissivas somam (OR) com as existentes.

CREATE POLICY "enrollments_select_admin" ON public.enrollments
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "enrollments_select_course_owner" ON public.enrollments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = enrollments.course_id
        AND c.created_by = auth.uid()
    )
  );
