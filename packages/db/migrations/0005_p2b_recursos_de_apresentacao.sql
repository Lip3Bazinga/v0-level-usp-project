CREATE TABLE "content_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" text NOT NULL,
	"content_type" text NOT NULL,
	"data_base64" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_assets_path_unique" UNIQUE("path"),
	CONSTRAINT "content_assets_content_type_check" CHECK ("content_assets"."content_type" in ('image/svg+xml','image/png','image/jpeg','image/webp','image/gif')),
	CONSTRAINT "content_assets_size_bytes_check" CHECK ("content_assets"."size_bytes" > 0)
);
--> statement-breakpoint
ALTER TABLE "lesson_steps" DROP CONSTRAINT "lesson_steps_kind_check";--> statement-breakpoint
ALTER TABLE "lesson_steps" ADD COLUMN "exercise_mode" text DEFAULT 'codigo' NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_steps" ADD COLUMN "parsons_lines" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_steps" ADD COLUMN "expected_output" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_steps" ADD CONSTRAINT "lesson_steps_exercise_mode_check" CHECK ("lesson_steps"."exercise_mode" in ('codigo','lacunas','ordenar'));--> statement-breakpoint
ALTER TABLE "lesson_steps" ADD CONSTRAINT "lesson_steps_kind_check" CHECK ("lesson_steps"."kind" in ('leitura','exercicio','quiz','previsao'));
--> statement-breakpoint
-- updated_at da tabela nova mantido pelo mesmo gatilho da migração 0001.
CREATE OR REPLACE TRIGGER content_assets_updated_at BEFORE UPDATE ON content_assets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
