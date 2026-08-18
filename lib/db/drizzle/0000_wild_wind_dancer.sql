CREATE TYPE "public"."resource_type" AS ENUM('Lecture notes', 'Previous year paper', 'Lab manual', 'Assignment', 'Reference');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "branches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "branches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "years" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "years_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"branch_id" integer NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semesters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "semesters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"year_id" integer NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subjects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"semester_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "resources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subject_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"resource_type" "resource_type" NOT NULL,
	"google_drive_url" text NOT NULL,
	"is_new" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "submissions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"branch_id" integer,
	"year_id" integer,
	"semester_id" integer,
	"subject_id" integer,
	"resource_type" "resource_type" NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"google_drive_url" text NOT NULL,
	"student_name" text NOT NULL,
	"student_email" text NOT NULL,
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"rejection_reason" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text
);
--> statement-breakpoint
ALTER TABLE "years" ADD CONSTRAINT "years_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_year_id_years_id_fk" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_year_id_years_id_fk" FOREIGN KEY ("year_id") REFERENCES "public"."years"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_semester_id_semesters_id_fk" FOREIGN KEY ("semester_id") REFERENCES "public"."semesters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branches_short_name_unique_idx" ON "branches" USING btree ("short_name");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_name_unique_idx" ON "branches" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "years_branch_id_name_unique_idx" ON "years" USING btree ("branch_id","name");--> statement-breakpoint
CREATE INDEX "years_branch_id_idx" ON "years" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "semesters_year_id_name_unique_idx" ON "semesters" USING btree ("year_id","name");--> statement-breakpoint
CREATE INDEX "semesters_year_id_idx" ON "semesters" USING btree ("year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_semester_id_name_unique_idx" ON "subjects" USING btree ("semester_id","name");--> statement-breakpoint
CREATE INDEX "subjects_semester_id_idx" ON "subjects" USING btree ("semester_id");--> statement-breakpoint
CREATE INDEX "resources_subject_id_idx" ON "resources" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "resources_resource_type_idx" ON "resources" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "resources_is_featured_idx" ON "resources" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "resources_is_verified_idx" ON "resources" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "resources_is_new_idx" ON "resources" USING btree ("is_new");--> statement-breakpoint
CREATE INDEX "resources_created_at_idx" ON "resources" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "submissions_branch_id_idx" ON "submissions" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "submissions_subject_id_idx" ON "submissions" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "submissions_submitted_at_idx" ON "submissions" USING btree ("submitted_at");