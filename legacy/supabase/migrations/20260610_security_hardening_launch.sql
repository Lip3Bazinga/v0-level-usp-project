-- ═══════════════════════════════════════════════════════════════════════════
-- Hardening de segurança pré-lançamento (aplicado via MCP em 2026-06-10)
-- 1. hidden_tests deixa de ser legível por clientes (column-level privileges)
-- 2. RPC get_lesson_hidden_tests para o painel do professor
-- 3. award_xp: valida auth.uid() e usa xp_reward real da lição
-- 4. reorder_lessons: restrito a teacher/admin
-- 5. grant_badges: só o próprio usuário
-- 6. search_path fixo em todas as funções
-- 7. Revoga EXECUTE de anon em RPCs internas
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Column-level: remove SELECT de tabela inteira e concede só colunas públicas
revoke select on table public.lessons from anon, authenticated;
grant select (
  id, title, slug, module, "order", difficulty, description,
  content_markdown, starter_code, libraries, xp_reward, time_limit,
  created_by, published, created_at, updated_at, course_id,
  checkpoints, starter_files, module_id
) on table public.lessons to anon, authenticated;

-- 2. RPC para o painel do professor (única forma de ler hidden_tests no cliente)
create or replace function public.get_lesson_hidden_tests(p_lesson_id uuid)
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select l.hidden_tests
  from public.lessons l
  where l.id = p_lesson_id
    and (public.is_teacher_or_admin() or l.created_by = auth.uid());
$$;
revoke execute on function public.get_lesson_hidden_tests(uuid) from public, anon;
grant execute on function public.get_lesson_hidden_tests(uuid) to authenticated;

-- 3. award_xp endurecido: mesmo nome/assinatura, mas ignora p_xp arbitrário
create or replace function public.award_xp(p_user_id uuid, p_lesson_id uuid, p_xp integer)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
DECLARE
  _already_completed  boolean;
  _real_xp            integer;
  _new_total_xp       integer;
  _new_level          integer;
  _last_activity_date date;
  _today              date;
  _new_streak         integer;
  _new_max_streak     integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT xp_reward INTO _real_xp
  FROM public.lessons
  WHERE id = p_lesson_id AND published = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lesson_not_found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress
    WHERE user_id = p_user_id AND lesson_id = p_lesson_id AND status = 'completed'
  ) INTO _already_completed;

  INSERT INTO public.lesson_progress (user_id, lesson_id, status, xp_earned, completed_at)
  VALUES (p_user_id, p_lesson_id, 'completed', _real_xp, NOW())
  ON CONFLICT (user_id, lesson_id)
  DO UPDATE SET status = 'completed', xp_earned = _real_xp, completed_at = NOW();

  IF NOT _already_completed THEN
    SELECT total_xp + _real_xp INTO _new_total_xp
    FROM public.profiles WHERE id = p_user_id;

    _new_level := GREATEST(1, FLOOR(_new_total_xp / 1000) + 1)::integer;

    _today := NOW() AT TIME ZONE 'America/Sao_Paulo';

    SELECT MAX(completed_at AT TIME ZONE 'America/Sao_Paulo')::date
    INTO _last_activity_date
    FROM public.lesson_progress
    WHERE user_id = p_user_id AND status = 'completed' AND lesson_id != p_lesson_id;

    SELECT current_streak, max_streak INTO _new_streak, _new_max_streak
    FROM public.profiles WHERE id = p_user_id;

    IF _last_activity_date IS NULL THEN
      _new_streak := 1;
    ELSIF _last_activity_date = _today THEN
      _new_streak := _new_streak;
    ELSIF _last_activity_date = _today - 1 THEN
      _new_streak := _new_streak + 1;
    ELSE
      _new_streak := 1;
    END IF;

    _new_max_streak := GREATEST(_new_max_streak, _new_streak);

    UPDATE public.profiles
    SET total_xp          = _new_total_xp,
        level             = _new_level,
        lessons_completed = lessons_completed + 1,
        current_streak    = _new_streak,
        max_streak        = _new_max_streak,
        updated_at        = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$function$;

-- 4. reorder_lessons restrito a teacher/admin
create or replace function public.reorder_lessons(p_course_id uuid, p_lesson_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
DECLARE
  _i integer;
BEGIN
  IF NOT public.is_teacher_or_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  FOR _i IN 1..array_length(p_lesson_ids, 1) LOOP
    UPDATE public.lessons
    SET "order" = _i
    WHERE id = p_lesson_ids[_i] AND course_id = p_course_id;
  END LOOP;
END;
$function$;

-- 5. grant_badges: apenas o próprio usuário
create or replace function public.grant_badges(p_user_id uuid)
returns table(id text, name text, description text, icon text, rarity text)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
DECLARE
  _xp        integer;
  _streak    integer;
  _maxstreak integer;
  _lessons   integer;
  _courses   integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT total_xp, current_streak, max_streak, lessons_completed, courses_completed
  INTO _xp, _streak, _maxstreak, _lessons, _courses
  FROM public.profiles WHERE profiles.id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH eligible AS (
    SELECT b.id
    FROM public.badges b
    WHERE b.active = true
      AND b.criteria_type <> 'manual'
      AND (
        (b.criteria_type = 'total_xp'          AND COALESCE(_xp, 0)        >= b.criteria_value) OR
        (b.criteria_type = 'current_streak'    AND COALESCE(_streak, 0)    >= b.criteria_value) OR
        (b.criteria_type = 'max_streak'        AND COALESCE(_maxstreak, 0) >= b.criteria_value) OR
        (b.criteria_type = 'lessons_completed' AND COALESCE(_lessons, 0)   >= b.criteria_value) OR
        (b.criteria_type = 'courses_completed' AND COALESCE(_courses, 0)   >= b.criteria_value)
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_badges ub
        WHERE ub.user_id = p_user_id AND ub.badge_id = b.id
      )
  ),
  inserted AS (
    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT p_user_id, eligible.id FROM eligible
    ON CONFLICT (user_id, badge_id) DO NOTHING
    RETURNING badge_id
  )
  SELECT b.id, b.name, b.description, b.icon, b.rarity
  FROM inserted
  JOIN public.badges b ON b.id = inserted.badge_id;
END;
$function$;

-- 6. search_path fixo nas demais funções flagradas pelos advisors
alter function public.log_audit(uuid, text, text, text, jsonb, text) set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.sync_course_stats(uuid) set search_path = public, pg_temp;
alter function public.trg_sync_course_on_lesson_change() set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.handle_updated_at() set search_path = public, pg_temp;

-- 7. anon não executa RPCs internas; triggers não são chamáveis por clientes
revoke execute on function public.award_xp(uuid, uuid, integer) from anon;
revoke execute on function public.grant_badges(uuid) from anon;
revoke execute on function public.reorder_lessons(uuid, uuid[]) from anon;
revoke execute on function public.log_audit(uuid, text, text, text, jsonb, text) from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.set_updated_at() from anon, authenticated;
revoke execute on function public.handle_updated_at() from anon, authenticated;
revoke execute on function public.trg_sync_course_on_lesson_change() from anon, authenticated;
revoke execute on function public.sync_course_stats(uuid) from anon, authenticated;
