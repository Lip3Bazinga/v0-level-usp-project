-- LevelUSP — Schema completo (sincronizado com o banco ao vivo em 2026-06-09)
-- Rodar num projeto Supabase limpo recria todas as 7 tabelas, funções, triggers e RLS.
-- Ordem: funções helper → tabelas (respeitando FKs) → policies → triggers.

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÕES HELPER (usadas em policies — devem existir antes das tabelas)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGER HELPER: updated_at
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Alias usado em alguns triggers mais novos
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. PROFILES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profiles (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT        NOT NULL,
  full_name         TEXT        NOT NULL DEFAULT '',
  username          TEXT        UNIQUE,
  avatar_url        TEXT,
  bio               TEXT,
  role              TEXT        NOT NULL DEFAULT 'student'
                                CHECK (role IN ('student', 'teacher', 'admin')),
  level             INTEGER     NOT NULL DEFAULT 1,
  total_xp          INTEGER     NOT NULL DEFAULT 0,
  current_streak    INTEGER     NOT NULL DEFAULT 0,
  max_streak        INTEGER     NOT NULL DEFAULT 0,
  courses_completed INTEGER     NOT NULL DEFAULT 0,
  lessons_completed INTEGER     NOT NULL DEFAULT 0,
  last_login_date   DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete any profile"
  ON public.profiles FOR DELETE USING (is_admin());

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-cria perfil no signup (email/password + OAuth Google/GitHub)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _full_name     TEXT;
  _username      TEXT;
  _base_username TEXT;
BEGIN
  _full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  _base_username := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '_', 'g'));
  _username := _base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = _username) LOOP
    _username := _base_username || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  END LOOP;

  INSERT INTO public.profiles (id, email, full_name, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    _full_name,
    _username,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. COURSES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.courses (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title                       TEXT        NOT NULL,
  description                 TEXT        NOT NULL DEFAULT '',
  long_description            TEXT        NOT NULL DEFAULT '',
  thumbnail_url               TEXT,
  cover_image_url             TEXT,
  level                       TEXT        NOT NULL DEFAULT 'iniciante'
                                          CHECK (level IN ('iniciante', 'intermediario', 'avancado')),
  tags                        TEXT[]      NOT NULL DEFAULT '{}',
  total_xp                    INTEGER     NOT NULL DEFAULT 0,
  estimated_hours             INTEGER     NOT NULL DEFAULT 0,
  published                   BOOLEAN     NOT NULL DEFAULT false,
  created_by                  UUID        REFERENCES public.profiles(id),
  final_project_title         TEXT,
  final_project_description   TEXT,
  final_project_starter_code  TEXT        DEFAULT '',
  final_project_tests         TEXT        DEFAULT '',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_select_published"
  ON public.courses FOR SELECT USING (published = true);

CREATE POLICY "courses_select_own"
  ON public.courses FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "courses_insert_own"
  ON public.courses FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "courses_update_own"
  ON public.courses FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "courses_delete_own"
  ON public.courses FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY "courses_admin_all"
  ON public.courses FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. LESSONS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.lessons (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  slug             TEXT        UNIQUE,
  module           TEXT        NOT NULL,
  "order"          INTEGER     NOT NULL DEFAULT 1,
  difficulty       TEXT        NOT NULL DEFAULT 'iniciante'
                               CHECK (difficulty IN ('iniciante', 'intermediario', 'avancado')),
  description      TEXT        NOT NULL DEFAULT '',
  content_markdown TEXT        NOT NULL DEFAULT '',
  starter_code     TEXT        NOT NULL DEFAULT '',
  solution_code    TEXT,
  hidden_tests     TEXT        NOT NULL DEFAULT '',
  libraries        TEXT[]      DEFAULT '{}',
  xp_reward        INTEGER     NOT NULL DEFAULT 50,
  time_limit       INTEGER     NOT NULL DEFAULT 300,
  published        BOOLEAN     NOT NULL DEFAULT false,
  course_id        UUID        REFERENCES public.courses(id),
  created_by       UUID        REFERENCES public.profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published lessons are viewable by everyone"
  ON public.lessons FOR SELECT USING (published = true);

CREATE POLICY "Teachers can view all lessons"
  ON public.lessons FOR SELECT USING (is_teacher_or_admin());

CREATE POLICY "Teachers can create lessons"
  ON public.lessons FOR INSERT WITH CHECK (is_teacher_or_admin());

CREATE POLICY "Teachers can update their own lessons"
  ON public.lessons FOR UPDATE USING (created_by = auth.uid() OR is_admin());

CREATE POLICY "Teachers can delete own lessons"
  ON public.lessons FOR DELETE USING (created_by = auth.uid() OR is_admin());

CREATE POLICY "Admins can manage all lessons"
  ON public.lessons FOR ALL USING (is_admin());

CREATE TRIGGER set_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Recalcula total_xp do curso quando uma lição é inserida/atualizada/deletada
CREATE OR REPLACE FUNCTION public.sync_course_stats(p_course_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.courses
  SET
    total_xp   = COALESCE((SELECT SUM(xp_reward) FROM public.lessons WHERE course_id = p_course_id AND published = true), 0),
    updated_at = NOW()
  WHERE id = p_course_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_course_on_lesson_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.course_id IS DISTINCT FROM NEW.course_id) THEN
    IF OLD.course_id IS NOT NULL THEN
      PERFORM public.sync_course_stats(OLD.course_id);
    END IF;
  END IF;

  IF TG_OP != 'DELETE' AND NEW.course_id IS NOT NULL THEN
    PERFORM public.sync_course_stats(NEW.course_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_lessons_course_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_course_on_lesson_change();

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. LESSON_PROGRESS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  lesson_id     UUID        NOT NULL REFERENCES public.lessons(id)   ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'not_started'
                            CHECK (status IN ('not_started', 'in_progress', 'completed')),
  code_snapshot TEXT,
  score         INTEGER,
  xp_earned     INTEGER     NOT NULL DEFAULT 0,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
  ON public.lesson_progress FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Teachers can view all progress"
  ON public.lesson_progress FOR SELECT USING (is_teacher_or_admin());

CREATE POLICY "Users can insert their own progress"
  ON public.lesson_progress FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress"
  ON public.lesson_progress FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all progress"
  ON public.lesson_progress FOR ALL USING (is_admin());

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. ENROLLMENTS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.enrollments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  course_id   UUID        NOT NULL REFERENCES public.courses(id)   ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollments_select_own"
  ON public.enrollments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "enrollments_insert_own"
  ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "enrollments_delete_own"
  ON public.enrollments FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. TEACHER_APPROVALS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.teacher_approvals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id),
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  institution TEXT        NOT NULL DEFAULT '',
  motivation  TEXT        NOT NULL DEFAULT '',
  status      TEXT        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID        REFERENCES public.profiles(id),
  review_note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.teacher_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit approval"
  ON public.teacher_approvals FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own approval"
  ON public.teacher_approvals FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage teacher_approvals"
  ON public.teacher_approvals FOR ALL USING (is_admin());

CREATE TRIGGER set_teacher_approvals_updated_at
  BEFORE UPDATE ON public.teacher_approvals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. AUDIT_LOG
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.audit_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID        REFERENCES public.profiles(id),
  actor_name TEXT        NOT NULL DEFAULT '',
  action     TEXT        NOT NULL,
  target     TEXT        NOT NULL DEFAULT '',
  meta       JSONB       DEFAULT '{}',
  severity   TEXT        NOT NULL DEFAULT 'info'
             CHECK (severity IN ('info', 'warning', 'danger')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit_log"
  ON public.audit_log FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert audit_log"
  ON public.audit_log FOR INSERT WITH CHECK (is_admin());

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÕES DE NEGÓCIO
-- ══════════════════════════════════════════════════════════════════════════════

-- award_xp: credita XP, recalcula nível e streak ao completar uma lição.
-- Idempotente: uma lição só conta XP/streak uma vez (primeira conclusão).
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id   UUID,
  p_lesson_id UUID,
  p_xp        INTEGER
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _already_completed  boolean;
  _new_total_xp       integer;
  _new_level          integer;
  _last_activity_date date;
  _today              date;
  _new_streak         integer;
  _new_max_streak     integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.lesson_progress
    WHERE user_id  = p_user_id
      AND lesson_id = p_lesson_id
      AND status   = 'completed'
  ) INTO _already_completed;

  INSERT INTO public.lesson_progress (user_id, lesson_id, status, xp_earned, completed_at)
  VALUES (p_user_id, p_lesson_id, 'completed', p_xp, NOW())
  ON CONFLICT (user_id, lesson_id)
  DO UPDATE SET
    status       = 'completed',
    xp_earned    = p_xp,
    completed_at = NOW();

  IF NOT _already_completed THEN
    SELECT total_xp + p_xp INTO _new_total_xp
    FROM public.profiles WHERE id = p_user_id;

    _new_level := GREATEST(1, FLOOR(_new_total_xp / 1000) + 1)::integer;

    _today := NOW() AT TIME ZONE 'America/Sao_Paulo';

    SELECT MAX(completed_at AT TIME ZONE 'America/Sao_Paulo')::date
    INTO _last_activity_date
    FROM public.lesson_progress
    WHERE user_id  = p_user_id
      AND status   = 'completed'
      AND lesson_id != p_lesson_id;

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
    SET
      total_xp          = _new_total_xp,
      level             = _new_level,
      lessons_completed = lessons_completed + 1,
      current_streak    = _new_streak,
      max_streak        = _new_max_streak,
      updated_at        = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$;

-- reorder_lessons: atualiza a coluna "order" de um array de lesson_ids em ordem.
CREATE OR REPLACE FUNCTION public.reorder_lessons(
  p_course_id  UUID,
  p_lesson_ids UUID[]
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _i integer;
BEGIN
  FOR _i IN 1..array_length(p_lesson_ids, 1) LOOP
    UPDATE public.lessons
    SET "order" = _i
    WHERE id = p_lesson_ids[_i] AND course_id = p_course_id;
  END LOOP;
END;
$$;

-- log_audit: insere uma linha no audit_log.
CREATE OR REPLACE FUNCTION public.log_audit(
  p_actor_id   UUID,
  p_actor_name TEXT,
  p_action     TEXT,
  p_target     TEXT,
  p_meta       JSONB    DEFAULT '{}',
  p_severity   TEXT     DEFAULT 'info'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, actor_name, action, target, meta, severity)
  VALUES (p_actor_id, p_actor_name, p_action, p_target, p_meta, p_severity);
END;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- STORAGE
-- ══════════════════════════════════════════════════════════════════════════════
-- Bucket para capas de cursos (criar via painel ou CLI):
--   supabase storage create course-covers --public
