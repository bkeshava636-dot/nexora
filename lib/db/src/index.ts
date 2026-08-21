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
    `);
  } catch (err) {
    console.error("Warning: could not ensure database tables:", err);
  } finally {
    client.release();
  }
}

export * from "./schema";
