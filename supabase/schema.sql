-- LevelUSP — Schema completo (sincronizado com o banco ao vivo em 2026-07-14)
-- Rodar num projeto Supabase limpo recria as 15 tabelas, funções, triggers,
-- policies, grants por coluna e policies de storage.
-- Ordem: funções helper → tabelas (respeitando FKs) → policies → triggers →
--        funções de negócio → grants por coluna → storage.

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÕES HELPER (usadas em policies — devem existir antes das tabelas)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('teacher', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- TRIGGER HELPERS: updated_at
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Alias usado em alguns triggers mais novos
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.update_notes_updated_at()
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
  suspended         BOOLEAN     NOT NULL DEFAULT false,
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
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
  created_by                  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
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

-- Só professores/admins criam cursos (migração 20260714_restrict_course_insert_to_teachers)
CREATE POLICY "courses_insert_own"
  ON public.courses FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );

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
-- 3. MODULES (agrupamento visual de lições no dashboard)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.modules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT        DEFAULT '',
  icon        TEXT        DEFAULT 'BookOpen',
  color       TEXT        DEFAULT 'bg-level-purple',
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules public read"
  ON public.modules FOR SELECT USING (true);

CREATE POLICY "modules admin all"
  ON public.modules FOR ALL USING (is_admin());

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. LESSONS
-- ══════════════════════════════════════════════════════════════════════════════
-- ATENÇÃO: hidden_tests NÃO tem grant de SELECT para anon/authenticated.
-- select("*") FALHA no cliente — use sempre PUBLIC_LESSON_FIELDS (lib/supabase/lessons.ts).
-- A coluna solution_code foi removida no hardening de 2026-06-10.

CREATE TABLE IF NOT EXISTS public.lessons (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  slug             TEXT        UNIQUE,
  module           TEXT        NOT NULL,
  module_id        UUID        REFERENCES public.modules(id),
  "order"          INTEGER     NOT NULL DEFAULT 1,
  difficulty       TEXT        NOT NULL DEFAULT 'iniciante'
                               CHECK (difficulty IN ('iniciante', 'intermediario', 'avancado')),
  description      TEXT        NOT NULL DEFAULT '',
  content_markdown TEXT        NOT NULL DEFAULT '',
  starter_code     TEXT        NOT NULL DEFAULT '',
  starter_files    JSONB       NOT NULL DEFAULT '[]',
  checkpoints      JSONB       NOT NULL DEFAULT '[]',
  hidden_tests     TEXT        NOT NULL DEFAULT '',
  libraries        TEXT[]      DEFAULT '{}',
  lesson_type      TEXT        NOT NULL DEFAULT 'coding'
                               CHECK (lesson_type IN ('coding', 'theory', 'quiz')),
  -- Nota mínima (%) para concluir uma lição do tipo 'quiz'
  quiz_passing_score INTEGER   NOT NULL DEFAULT 70
                               CHECK (quiz_passing_score BETWEEN 1 AND 100),
  xp_reward        INTEGER     NOT NULL DEFAULT 50,
  time_limit       INTEGER     NOT NULL DEFAULT 300,
  published        BOOLEAN     NOT NULL DEFAULT false,
  course_id        UUID        REFERENCES public.courses(id) ON DELETE SET NULL,
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
RETURNS void LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE public.courses
  SET
    total_xp   = COALESCE((SELECT SUM(xp_reward) FROM public.lessons WHERE course_id = p_course_id AND published = true), 0),
    updated_at = NOW()
  WHERE id = p_course_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_course_on_lesson_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
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

CREATE INDEX IF NOT EXISTS lessons_course_published_order_idx
  ON public.lessons (course_id, published, "order");

CREATE TRIGGER trg_lessons_course_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_course_on_lesson_change();

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. LESSON_PROGRESS
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

CREATE INDEX IF NOT EXISTS lesson_progress_lesson_idx
  ON public.lesson_progress (lesson_id, status);

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
-- 6. ENROLLMENTS
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
-- 7. TEACHER_APPROVALS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.teacher_approvals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  institution  TEXT        NOT NULL DEFAULT '',
  motivation   TEXT        NOT NULL DEFAULT '',
  status       TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_note  TEXT,
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
-- 8. AUDIT_LOG
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.audit_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
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
-- 9. PLATFORM_SETTINGS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL DEFAULT 'null',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read platform_settings"
  ON public.platform_settings FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update platform_settings"
  ON public.platform_settings FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can upsert platform_settings"
  ON public.platform_settings FOR INSERT WITH CHECK (is_admin());

CREATE TRIGGER set_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. NOTIFICATIONS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  body       TEXT        DEFAULT '',
  kind       TEXT        NOT NULL DEFAULT 'info'
             CHECK (kind IN ('info', 'success', 'warning', 'danger')),
  read       BOOLEAN     NOT NULL DEFAULT false,
  href       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notifications read"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own notifications insert"
  ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own notifications update"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 11. BADGES + 12. USER_BADGES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.badges (
  id             TEXT        PRIMARY KEY,
  name           TEXT        NOT NULL,
  description    TEXT        NOT NULL DEFAULT '',
  icon           TEXT        NOT NULL DEFAULT 'Award',
  rarity         TEXT        NOT NULL DEFAULT 'common'
                 CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  criteria_type  TEXT        NOT NULL
                 CHECK (criteria_type IN ('total_xp', 'current_streak', 'max_streak',
                                          'lessons_completed', 'courses_completed', 'manual')),
  criteria_value INTEGER     NOT NULL DEFAULT 0,
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  active         BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges public read"
  ON public.badges FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id  TEXT        NOT NULL REFERENCES public.badges(id)   ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_badges public read"
  ON public.user_badges FOR SELECT USING (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- 13. LIBRARY_CATALOG + 14. LIBRARY_REQUESTS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.library_catalog (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL UNIQUE,
  display_name   TEXT        NOT NULL,
  description    TEXT,
  category       TEXT        NOT NULL DEFAULT 'general',
  pyodide_native BOOLEAN     NOT NULL DEFAULT false,
  active         BOOLEAN     NOT NULL DEFAULT true,
  added_by       UUID        REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.library_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lib_catalog_public_read"
  ON public.library_catalog FOR SELECT USING (true);

CREATE POLICY "lib_catalog_admin_write"
  ON public.library_catalog FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS public.library_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID        NOT NULL REFERENCES public.profiles(id),
  library_name TEXT        NOT NULL,
  display_name TEXT,
  description  TEXT,
  use_case     TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending',
  reviewed_by  UUID        REFERENCES public.profiles(id),
  review_notes TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ
);

ALTER TABLE public.library_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lib_requests_select"
  ON public.library_requests FOR SELECT
  USING (requested_by = auth.uid()
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "lib_requests_insert"
  ON public.library_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by
              AND EXISTS (SELECT 1 FROM public.profiles
                          WHERE id = auth.uid() AND role IN ('teacher', 'admin')));

CREATE POLICY "lib_requests_admin_update"
  ON public.library_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 15. NOTES (anotações pessoais do aluno, editor TipTap)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id  UUID        REFERENCES public.lessons(id) ON DELETE SET NULL,
  course_id  UUID        REFERENCES public.courses(id) ON DELETE SET NULL,
  title      TEXT,
  content    TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select_own"
  ON public.notes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notes_insert_own"
  ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_update_own"
  ON public.notes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notes_delete_own"
  ON public.notes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_notes_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- 15b. LESSON_QUIZ_QUESTIONS (lições do tipo 'quiz')
-- ══════════════════════════════════════════════════════════════════════════════
-- Mesmo modelo de segurança de exam_questions: RLS deny-all + REVOKE, o gabarito
-- (correct_index) só é lido pelo service role na rota de correção, ou pelo
-- professor dono da lição via RPC get_lesson_quiz_questions.

CREATE TABLE IF NOT EXISTS public.lesson_quiz_questions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id     UUID        NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  prompt        TEXT        NOT NULL,
  options       JSONB       NOT NULL DEFAULT '[]',
  correct_index INTEGER     NOT NULL CHECK (correct_index >= 0),
  explanation   TEXT        NOT NULL DEFAULT '',
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lesson_quiz_questions_lesson_idx
  ON public.lesson_quiz_questions (lesson_id, sort_order);

ALTER TABLE public.lesson_quiz_questions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lesson_quiz_questions FROM anon, authenticated;

-- RPCs: get_lesson_quiz_questions(uuid) e replace_lesson_quiz_questions(uuid, jsonb)
-- definidas em supabase/migrations/20260724_add_quiz_lesson_type.sql

-- ══════════════════════════════════════════════════════════════════════════════
-- 16. EXAMS + 17. EXAM_QUESTIONS + 18. EXAM_ATTEMPTS + 19. CERTIFICATES
-- ══════════════════════════════════════════════════════════════════════════════
-- exam_questions: RLS deny-all para clientes — gabarito só via service role.
-- exam_attempts: cliente só lê as próprias; escrita só via service role.

CREATE TABLE IF NOT EXISTS public.exams (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id          UUID        NOT NULL UNIQUE REFERENCES public.courses(id) ON DELETE CASCADE,
  title              TEXT        NOT NULL,
  description        TEXT        NOT NULL DEFAULT '',
  passing_score      INTEGER     NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 1 AND 100),
  time_limit_minutes INTEGER     NOT NULL DEFAULT 45 CHECK (time_limit_minutes > 0),
  cooldown_minutes   INTEGER     NOT NULL DEFAULT 60 CHECK (cooldown_minutes >= 0),
  active             BOOLEAN     NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exams_public_read" ON public.exams FOR SELECT USING (active = true);
CREATE POLICY "exams_admin_all"   ON public.exams FOR ALL    USING (is_admin());

CREATE TABLE IF NOT EXISTS public.exam_questions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id       UUID        NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  prompt        TEXT        NOT NULL,
  options       JSONB       NOT NULL DEFAULT '[]',
  correct_index INTEGER     NOT NULL CHECK (correct_index >= 0),
  explanation   TEXT        NOT NULL DEFAULT '',
  topic         TEXT        NOT NULL DEFAULT '',
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  active        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.exam_questions FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id      UUID        NOT NULL REFERENCES public.exams(id)    ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_ids UUID[]      NOT NULL DEFAULT '{}',
  answers      JSONB       NOT NULL DEFAULT '{}',
  score        NUMERIC(5,2),
  passed       BOOLEAN,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_attempts_select_own"
  ON public.exam_attempts FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS exam_attempts_user_exam_idx
  ON public.exam_attempts (user_id, exam_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.certificates (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id         UUID        NOT NULL REFERENCES public.courses(id)  ON DELETE CASCADE,
  verification_code TEXT        NOT NULL UNIQUE,
  exam_score        NUMERIC(5,2),
  project_status    TEXT        NOT NULL DEFAULT 'passed'
                    CHECK (project_status IN ('passed', 'waived')),
  issued_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certificates_select_own"
  ON public.certificates FOR SELECT USING (auth.uid() = user_id);

-- Verificação pública (sem login) por código
CREATE OR REPLACE FUNCTION public.verify_certificate(p_code TEXT)
RETURNS TABLE (student_name TEXT, course_title TEXT, issued_at TIMESTAMPTZ, exam_score NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p.full_name, c.title, cert.issued_at, cert.exam_score
  FROM public.certificates cert
  JOIN public.profiles p ON p.id = cert.user_id
  JOIN public.courses  c ON c.id = cert.course_id
  WHERE cert.verification_code = UPPER(TRIM(p_code));
$$;

GRANT EXECUTE ON FUNCTION public.verify_certificate(TEXT) TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 20. RATE_LIMITS (janela deslizante por usuário/ação — service role apenas)
-- ══════════════════════════════════════════════════════════════════════════════
-- Deny-all: RLS ligado e nenhuma policy de propósito. Usada por
-- /api/exam/[courseId]/start (Next) e api/evaluate.py (Python Function).

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL,
  action     TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rate_limits_user_action_created_idx
  ON public.rate_limits (user_id, action, created_at DESC);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════════════════════
-- FUNÇÕES DE NEGÓCIO
-- ══════════════════════════════════════════════════════════════════════════════

-- award_xp: credita XP, recalcula nível e streak ao completar uma lição.
-- Idempotente e endurecida: só o próprio usuário autenticado pode chamar,
-- e o XP creditado é sempre o xp_reward real da lição (ignora p_xp adulterado).
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id   UUID,
  p_lesson_id UUID,
  p_xp        INTEGER
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
$$;

-- reorder_lessons: atualiza a coluna "order" de um array de lesson_ids em ordem.
-- Restrita a professores/admins.
CREATE OR REPLACE FUNCTION public.reorder_lessons(
  p_course_id  UUID,
  p_lesson_ids UUID[]
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
$$;

-- log_audit: insere uma linha no audit_log (chamada via service role).
CREATE OR REPLACE FUNCTION public.log_audit(
  p_actor_id   UUID,
  p_actor_name TEXT,
  p_action     TEXT,
  p_target     TEXT,
  p_meta       JSONB    DEFAULT '{}',
  p_severity   TEXT     DEFAULT 'info'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.audit_log (actor_id, actor_name, action, target, meta, severity)
  VALUES (p_actor_id, p_actor_name, p_action, p_target, p_meta, p_severity);
END;
$$;

-- grant_badges: concede ao usuário todos os badges automáticos elegíveis
-- e retorna apenas os recém-conquistados (para a animação no cliente).
CREATE OR REPLACE FUNCTION public.grant_badges(p_user_id UUID)
RETURNS TABLE(id text, name text, description text, icon text, rarity text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
$$;

-- get_lesson_hidden_tests: única forma de ler hidden_tests fora do service role.
-- Só o professor dono da lição (ou teacher/admin) recebe o conteúdo.
CREATE OR REPLACE FUNCTION public.get_lesson_hidden_tests(p_lesson_id UUID)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT l.hidden_tests
  FROM public.lessons l
  WHERE l.id = p_lesson_id
    AND (public.is_teacher_or_admin() OR l.created_by = auth.uid());
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- GRANTS POR COLUNA (hardening 2026-06-10 + fix 2026-07-14)
-- ══════════════════════════════════════════════════════════════════════════════
-- hidden_tests nunca chega ao cliente: o SELECT em lessons é concedido
-- coluna a coluna, sem hidden_tests. select("*") falha por design.

REVOKE SELECT ON public.lessons FROM anon, authenticated;
GRANT SELECT (
  id, title, slug, module, module_id, "order", difficulty, description,
  content_markdown, starter_code, starter_files, checkpoints, libraries,
  lesson_type, quiz_passing_score, xp_reward, time_limit, published, course_id,
  created_by, created_at, updated_at
) ON public.lessons TO anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- STORAGE
-- ══════════════════════════════════════════════════════════════════════════════
-- Buckets públicos: course-covers e avatars (criar via painel ou CLI):
--   supabase storage create course-covers --public
--   supabase storage create avatars --public

-- avatars: cada usuário gerencia a própria pasta (auth.uid())
CREATE POLICY "avatars public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars own upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars own update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- course-covers: pasta = courseId; só o dono do curso (ou admin) gerencia.
-- UPDATE é necessário porque o upload da capa usa upsert=true.
CREATE POLICY "course_covers_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-covers');

CREATE POLICY "course_covers_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-covers'
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.created_by = auth.uid()
             OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

CREATE POLICY "course_covers_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'course-covers'
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.created_by = auth.uid()
             OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  )
  WITH CHECK (
    bucket_id = 'course-covers'
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.created_by = auth.uid()
             OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

CREATE POLICY "course_covers_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'course-covers'
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.created_by = auth.uid()
             OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );
