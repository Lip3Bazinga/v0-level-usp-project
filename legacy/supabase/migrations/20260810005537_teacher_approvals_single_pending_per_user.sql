-- Nao havia trava de unicidade: o mesmo usuario acumulava varios pedidos
-- pendentes (Gustavo e Thiago tinham 2 cada), poluindo a fila do admin.

-- 1) Novo estado 'superseded' (mesmo padrao usado para adicionar 'quiz' ao
--    lesson_type). Distingue "substituido por pedido mais novo" de "rejeitado
--    pelo admin" -- misturar os dois falsearia o historico de decisoes.
ALTER TABLE public.teacher_approvals
  DROP CONSTRAINT IF EXISTS teacher_approvals_status_check;

ALTER TABLE public.teacher_approvals
  ADD CONSTRAINT teacher_approvals_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'superseded'::text]));

-- 2) Normaliza o historico: mantem o pedido mais recente de cada usuario como
--    pendente e marca os anteriores como 'superseded'. Nada e apagado.
WITH ranqueados AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id DESC) AS pos
  FROM public.teacher_approvals
  WHERE status = 'pending'
)
UPDATE public.teacher_approvals ta
SET status = 'superseded'
FROM ranqueados r
WHERE ta.id = r.id AND r.pos > 1;

-- 3) Impede novos duplicados: no maximo um pedido pendente por usuario.
CREATE UNIQUE INDEX IF NOT EXISTS teacher_approvals_um_pendente_por_usuario
  ON public.teacher_approvals (user_id)
  WHERE status = 'pending';
