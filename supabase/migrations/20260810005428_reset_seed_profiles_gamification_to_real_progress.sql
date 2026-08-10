-- Perfis semeados (ids aa0000...) tinham gamificacao ficticia: Marina com 127
-- licoes concluidas numa plataforma de 49 licoes, 153k XP no total, streaks de
-- 78 dias. Isso contaminava metricas, ranking e funil do admin.
-- Recalcula a partir do progresso REAL. Nao apaga nenhuma linha.
-- Perfis reais ficam intocados.

WITH progresso_real AS (
  SELECT p.id,
         COUNT(lp.*) FILTER (WHERE lp.status = 'completed')                    AS n_concluidas,
         COALESCE(SUM(lp.xp_earned) FILTER (WHERE lp.status = 'completed'), 0) AS xp
  FROM public.profiles p
  LEFT JOIN public.lesson_progress lp ON lp.user_id = p.id
  WHERE p.id::text LIKE 'aa0000%'
  GROUP BY p.id
)
UPDATE public.profiles p
SET total_xp          = r.xp,
    level             = GREATEST(1, FLOOR(r.xp / 1000) + 1)::integer,
    lessons_completed = r.n_concluidas,
    current_streak    = 0,
    max_streak        = 0,
    courses_completed = 0,
    updated_at        = NOW()
FROM progresso_real r
WHERE p.id = r.id;
