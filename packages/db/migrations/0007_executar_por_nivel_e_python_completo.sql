ALTER TABLE "lessons" DROP CONSTRAINT "lessons_runtime_check";--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "run_button_min_level" integer;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_run_button_min_level_check" CHECK ("courses"."run_button_min_level" >= 1);--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_runtime_check" CHECK ("lessons"."runtime" in ('python','python-dados','python-completo'));