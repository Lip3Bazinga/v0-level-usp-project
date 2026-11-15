-- Curso completo, passos e trilhas (docs/v2/curso-e-passos.md §2). Migração aditiva:
-- nada que existe é removido; colunas novas têm default seguro. Os CHECKs de
-- lessons.lesson_type (ganha 'guided') e badges.criteria_type (ganha
-- 'certificates_issued') são recriados com a lista nova. No fim, o nível dos perfis
-- é recalculado uma vez pela curva nova de XP (§3), para ficar coerente com total_xp.

CREATE TABLE IF NOT EXISTS "lesson_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"narrative_markdown" text DEFAULT '' NOT NULL,
	"starter_files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"solution_files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checkpoints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"test_cases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hints" text[] DEFAULT '{}'::text[] NOT NULL,
	"quiz_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"xp" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_steps_lesson_id_order_key" UNIQUE("lesson_id","order"),
	CONSTRAINT "lesson_steps_order_check" CHECK ("lesson_steps"."order" >= 1),
	CONSTRAINT "lesson_steps_kind_check" CHECK ("lesson_steps"."kind" in ('leitura','exercicio','quiz')),
	CONSTRAINT "lesson_steps_xp_check" CHECK ("lesson_steps"."xp" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "course_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_completions_user_id_course_id_key" UNIQUE("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_step_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"hints_revealed" integer DEFAULT 0 NOT NULL,
	"solution_viewed" boolean DEFAULT false NOT NULL,
	"xp_awarded" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_step_progress_user_id_step_id_key" UNIQUE("user_id","step_id"),
	CONSTRAINT "lesson_step_progress_status_check" CHECK ("lesson_step_progress"."status" in ('in_progress','completed')),
	CONSTRAINT "lesson_step_progress_attempts_check" CHECK ("lesson_step_progress"."attempts" >= 0),
	CONSTRAINT "lesson_step_progress_hints_revealed_check" CHECK ("lesson_step_progress"."hints_revealed" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "track_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"verification_code" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "track_certificates_verification_code_unique" UNIQUE("verification_code"),
	CONSTRAINT "track_certificates_user_id_track_id_key" UNIQUE("user_id","track_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "track_courses" (
	"track_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "track_courses_track_id_course_id_pk" PRIMARY KEY("track_id","course_id"),
	CONSTRAINT "track_courses_track_id_position_key" UNIQUE("track_id","position")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT 'BookOpen' NOT NULL,
	"color" text DEFAULT 'bg-level-purple' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"certificate_title" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tracks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_type_check" CHECK ("events"."type" in ('lesson_viewed','step_submitted','step_completed','hint_revealed','solution_viewed','lesson_completed','quiz_answered','exam_started','exam_submitted','certificate_issued','login'))
);
--> statement-breakpoint
ALTER TABLE "lessons" DROP CONSTRAINT IF EXISTS "lessons_type_check";--> statement-breakpoint
ALTER TABLE "badges" DROP CONSTRAINT IF EXISTS "badges_criteria_type_check";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "experiment_condition" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "slug" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "prerequisite_course_id" uuid;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "sequential" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "runtime" text DEFAULT 'python' NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "is_project" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "objectives" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "solution_files" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN IF NOT EXISTS "solution_after_attempts" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "course_id" uuid;--> statement-breakpoint
ALTER TABLE "modules" ADD COLUMN IF NOT EXISTS "slug" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "step_id" uuid;--> statement-breakpoint
ALTER TABLE "lesson_steps" ADD CONSTRAINT "lesson_steps_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_completions" ADD CONSTRAINT "course_completions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_completions" ADD CONSTRAINT "course_completions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_step_progress" ADD CONSTRAINT "lesson_step_progress_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_step_progress" ADD CONSTRAINT "lesson_step_progress_step_id_lesson_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."lesson_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_certificates" ADD CONSTRAINT "track_certificates_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_certificates" ADD CONSTRAINT "track_certificates_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_courses" ADD CONSTRAINT "track_courses_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_courses" ADD CONSTRAINT "track_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lesson_step_progress_step_idx" ON "lesson_step_progress" USING btree ("step_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_user_created_idx" ON "events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_type_created_idx" ON "events" USING btree ("type","created_at");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_prerequisite_course_id_courses_id_fk" FOREIGN KEY ("prerequisite_course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_step_id_lesson_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."lesson_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "submissions_step_idx" ON "submissions" USING btree ("step_id");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_slug_key" UNIQUE("course_id","slug");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_experiment_condition_check" CHECK ("profiles"."experiment_condition" in ('gamificada','controle'));--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_runtime_check" CHECK ("lessons"."runtime" in ('python','python-dados'));--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_solution_after_attempts_check" CHECK ("lessons"."solution_after_attempts" >= 0);--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_type_check" CHECK ("lessons"."lesson_type" in ('coding','theory','quiz','guided'));--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_status_check" CHECK ("submissions"."status" in ('graded','error'));--> statement-breakpoint
ALTER TABLE "badges" ADD CONSTRAINT "badges_criteria_type_check" CHECK ("badges"."criteria_type" in ('total_xp','current_streak','max_streak','lessons_completed','courses_completed','certificates_issued','manual'));
--> statement-breakpoint
-- updated_at das tabelas novas mantido pelo mesmo gatilho da migração 0001.
CREATE OR REPLACE TRIGGER tracks_updated_at BEFORE UPDATE ON tracks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER lesson_steps_updated_at BEFORE UPDATE ON lesson_steps FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER lesson_step_progress_updated_at BEFORE UPDATE ON lesson_step_progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
-- Nível pela curva nova (contracts: levelForXp, inversa de 250·(n−1)·(n+2)), recalculado
-- a partir do XP total: só o GamificationService escreve esta coluna, sempre a partir do XP.
UPDATE profiles
   SET level = GREATEST(1, FLOOR((SQRT(9 + 4 * total_xp / 250.0) - 1) / 2))::integer
 WHERE level <> GREATEST(1, FLOOR((SQRT(9 + 4 * total_xp / 250.0) - 1) / 2))::integer;
