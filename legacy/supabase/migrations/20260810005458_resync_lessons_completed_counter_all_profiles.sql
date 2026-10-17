-- lessons_completed e um contador desnormalizado: award_xp incrementa, mas o
-- "resetar progresso" do admin apaga lesson_progress sem decrementar. Resultado:
-- o dashboard mostrava "3 licoes" no card e "6/10" na conquista, na mesma tela.
-- Ressincroniza o contador com a verdade para TODOS os perfis.

WITH progresso_real AS (
  SELECT p.id,
         COUNT(lp.*) FILTER (WHERE lp.status = 'completed') AS n_concluidas
  FROM public.profiles p
  LEFT JOIN public.lesson_progress lp ON lp.user_id = p.id
  GROUP BY p.id
)
UPDATE public.profiles p
SET lessons_completed = r.n_concluidas,
    updated_at        = NOW()
FROM progresso_real r
WHERE p.id = r.id
  AND p.lessons_completed IS DISTINCT FROM r.n_concluidas;
