# Curriculum Templates Database Migration

To provision the curriculum template tables in PostgreSQL:

## Option 1: Drizzle Push (Recommended)

Run the following command from the workspace root:

```powershell
pnpm run db:push
```

---

## Option 2: Direct SQL Migration

Execute the following SQL migration on your PostgreSQL database:

```sql
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
```
