-- Gatilhos mantidos no banco como última linha de defesa (regras principais vivem na API).

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER teacher_approvals_updated_at BEFORE UPDATE ON teacher_approvals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER platform_settings_updated_at BEFORE UPDATE ON platform_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

-- Uma lição concluída nunca volta a "em andamento" (evita XP farmável — herdado
-- da migração 20260810013000 do Supabase).
CREATE OR REPLACE FUNCTION preserve_lesson_completion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    NEW.status := 'completed';
    NEW.completed_at := OLD.completed_at;
    NEW.xp_earned := OLD.xp_earned;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trg_preserve_lesson_completion BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION preserve_lesson_completion();
--> statement-breakpoint

-- Mantém courses.total_xp = soma do XP das lições publicadas do curso.
CREATE OR REPLACE FUNCTION sync_course_total_xp() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  affected uuid[];
BEGIN
  affected := ARRAY[]::uuid[];
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.course_id IS NOT NULL THEN affected := affected || NEW.course_id; END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.course_id IS NOT NULL THEN affected := affected || OLD.course_id; END IF;
  UPDATE courses c
     SET total_xp = COALESCE((SELECT SUM(l.xp_reward) FROM lessons l WHERE l.course_id = c.id AND l.published), 0)
   WHERE c.id = ANY(affected);
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trg_sync_course_total_xp AFTER INSERT OR UPDATE OF course_id, xp_reward, published OR DELETE ON lessons
  FOR EACH ROW EXECUTE FUNCTION sync_course_total_xp();
