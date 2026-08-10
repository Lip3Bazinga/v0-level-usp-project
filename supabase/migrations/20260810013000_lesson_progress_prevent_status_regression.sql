-- BUG GRAVE: saveProgressSnapshot (autosave do editor) fazia upsert com
-- status='in_progress', rebaixando uma licao ja concluida. Na verificacao
-- seguinte o award_xp via _already_completed = false e creditava XP de novo:
-- XP farmavel infinitamente repetindo a mesma licao.
-- O banco passa a ser a fonte de verdade: concluida nunca volta a in_progress.

CREATE OR REPLACE FUNCTION public.preserve_lesson_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed' THEN
    NEW.status       := 'completed';
    NEW.completed_at := OLD.completed_at;
    NEW.xp_earned    := OLD.xp_earned;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_preserve_lesson_completion ON public.lesson_progress;

CREATE TRIGGER trg_preserve_lesson_completion
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_lesson_completion();
