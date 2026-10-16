CREATE TABLE "uploads" (
	"name" text PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "uploads_owner_idx" ON "uploads" USING btree ("owner_id","created_at");