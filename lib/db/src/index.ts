import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function ensureTables(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "reports" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "resource_id" integer NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
        "reason" text NOT NULL,
        "explanation" text,
        "status" text NOT NULL DEFAULT 'pending',
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "resolved_at" timestamp with time zone,
        "resolved_by" text
      );
      CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports" ("status");
      CREATE INDEX IF NOT EXISTS "reports_resource_id_idx" ON "reports" ("resource_id");
      CREATE INDEX IF NOT EXISTS "reports_created_at_idx" ON "reports" ("created_at");

      CREATE TABLE IF NOT EXISTS "curriculum_templates" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "branch_id" integer NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
        "year_id" integer NOT NULL REFERENCES "years"("id") ON DELETE CASCADE,
        "semester_id" integer NOT NULL REFERENCES "semesters"("id") ON DELETE CASCADE,
        "name" text NOT NULL DEFAULT '',
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "curriculum_templates_branch_year_semester_unique_idx"
        ON "curriculum_templates" ("branch_id", "year_id", "semester_id");
      CREATE INDEX IF NOT EXISTS "curriculum_templates_semester_id_idx"
        ON "curriculum_templates" ("semester_id");

      CREATE TABLE IF NOT EXISTS "curriculum_template_subjects" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "template_id" integer NOT NULL REFERENCES "curriculum_templates"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "code" text NOT NULL DEFAULT '',
        "description" text NOT NULL DEFAULT '',
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "curriculum_template_subjects_template_id_idx"
        ON "curriculum_template_subjects" ("template_id");

      CREATE TABLE IF NOT EXISTS "app_settings" (
        "key" text PRIMARY KEY,
        "value" text NOT NULL,
        "updated_by" text,
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "semester_qps" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "exam_year" text NOT NULL,
        "semester" text NOT NULL,
        "department" text NOT NULL,
        "title" text NOT NULL DEFAULT '',
        "download_url" text NOT NULL,
        "resource_type" text NOT NULL DEFAULT 'zip',
        "is_published" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
      ALTER TABLE "semester_qps" ADD COLUMN IF NOT EXISTS "resource_type" text NOT NULL DEFAULT 'zip';
      CREATE INDEX IF NOT EXISTS "semester_qps_exam_year_idx" ON "semester_qps" ("exam_year");
      CREATE INDEX IF NOT EXISTS "semester_qps_semester_idx" ON "semester_qps" ("semester");
      CREATE INDEX IF NOT EXISTS "semester_qps_department_idx" ON "semester_qps" ("department");
      CREATE INDEX IF NOT EXISTS "semester_qps_resource_type_idx" ON "semester_qps" ("resource_type");
      CREATE INDEX IF NOT EXISTS "semester_qps_is_published_idx" ON "semester_qps" ("is_published");
      CREATE INDEX IF NOT EXISTS "semester_qps_created_at_idx" ON "semester_qps" ("created_at");

      CREATE TABLE IF NOT EXISTS "ia_papers" (
        "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "academic_year" text NOT NULL,
        "semester" text NOT NULL,
        "department" text NOT NULL,
        "ia_type" text NOT NULL DEFAULT 'IA-1',
        "title" text NOT NULL DEFAULT '',
        "google_drive_url" text NOT NULL,
        "is_published" boolean NOT NULL DEFAULT true,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "ia_papers_academic_year_idx" ON "ia_papers" ("academic_year");
      CREATE INDEX IF NOT EXISTS "ia_papers_semester_idx" ON "ia_papers" ("semester");
      CREATE INDEX IF NOT EXISTS "ia_papers_department_idx" ON "ia_papers" ("department");
      CREATE INDEX IF NOT EXISTS "ia_papers_ia_type_idx" ON "ia_papers" ("ia_type");
      CREATE INDEX IF NOT EXISTS "ia_papers_is_published_idx" ON "ia_papers" ("is_published");
      CREATE INDEX IF NOT EXISTS "ia_papers_created_at_idx" ON "ia_papers" ("created_at");
    `);
  } catch (err) {
    console.error("Warning: could not ensure database tables:", err);
  } finally {
    client.release();
  }
}

export * from "./schema";
