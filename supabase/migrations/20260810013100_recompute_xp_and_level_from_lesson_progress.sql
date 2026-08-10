-- Corrige o XP inflado pelo bug de regressao de status (ver migration
-- lesson_progress_prevent_status_regression): a mesma licao podia creditar XP
-- varias vezes. Recalcula total_xp, level e lessons_completed a partir da
-- unica fonte confiavel: as linhas concluidas em lesson_progress.
-- Nada e apagado; so os agregados sao reescritos.

WITH verdade AS (
  SELECT p.id,
         COUNT(lp.*) FILTER (WHERE lp.status = 'completed')                    AS n_concluidas,
         COALESCE(SUM(lp.xp_earned) FILTER (WHERE lp.status = 'completed'), 0) AS xp
  FROM public.profiles p
  LEFT JOIN public.lesson_progress lp ON lp.user_id = p.id
  GROUP BY p.id
)
UPDATE public.profiles p
SET total_xp          = v.xp,
    level             = GREATEST(1, FLOOR(v.xp / 1000) + 1)::integer,
    lessons_completed = v.n_concluidas,
    updated_at        = NOW()
FROM verdade v
WHERE p.id = v.id
  AND (p.total_xp IS DISTINCT FROM v.xp
       OR p.lessons_completed IS DISTINCT FROM v.n_concluidas);
