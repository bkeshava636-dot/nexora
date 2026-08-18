import { and, asc, count, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, branches, years, semesters, subjects, resources, type Branch } from "@workspace/db";

export interface BranchWithCounts extends Branch {
  subjectCount: number;
  resourceCount: number;
}

async function subjectCountsByBranch(): Promise<Map<number, number>> {
  const rows = await db
    .select({ branchId: years.branchId, total: count(subjects.id) })
    .from(subjects)
    .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
    .innerJoin(years, eq(semesters.yearId, years.id))
    .groupBy(years.branchId);
  return new Map(rows.map((row) => [row.branchId, row.total]));
}

async function resourceCountsByBranch(): Promise<Map<number, number>> {
  const rows = await db
    .select({ branchId: years.branchId, total: count(resources.id) })
    .from(resources)
    .innerJoin(subjects, eq(resources.subjectId, subjects.id))
    .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
    .innerJoin(years, eq(semesters.yearId, years.id))
    .groupBy(years.branchId);
  return new Map(rows.map((row) => [row.branchId, row.total]));
}

/** Attaches derived subjectCount/resourceCount to every row in `branchRows`. */
export async function withBranchCounts(branchRows: Branch[]): Promise<BranchWithCounts[]> {
  const [subjectCounts, resourceCounts] = await Promise.all([
    subjectCountsByBranch(),
    resourceCountsByBranch(),
  ]);
  return branchRows.map((branch) => ({
    ...branch,
    subjectCount: subjectCounts.get(branch.id) ?? 0,
    resourceCount: resourceCounts.get(branch.id) ?? 0,
  }));
}

export async function listBranchesWithCounts(includeInactive: boolean): Promise<BranchWithCounts[]> {
  const rows = await db
    .select()
    .from(branches)
    .where(includeInactive ? undefined : eq(branches.isActive, true))
    .orderBy(asc(branches.displayOrder), asc(branches.id));
  return withBranchCounts(rows);
}

export async function getBranchWithCounts(id: number): Promise<BranchWithCounts | undefined> {
  const [branch] = await db.select().from(branches).where(eq(branches.id, id));
  if (!branch) return undefined;
  const [withCounts] = await withBranchCounts([branch]);
  return withCounts;
}

/** Full catalog join used for both listing and single-resource lookups. */
export function resourceCatalogSelect() {
  return db
    .select({
      id: resources.id,
      subjectId: resources.subjectId,
      title: resources.title,
      description: resources.description,
      resourceType: resources.resourceType,
      googleDriveUrl: resources.googleDriveUrl,
      isNew: resources.isNew,
      isFeatured: resources.isFeatured,
      isVerified: resources.isVerified,
      verifiedAt: resources.verifiedAt,
      verifiedBy: resources.verifiedBy,
      createdAt: resources.createdAt,
      updatedAt: resources.updatedAt,
      subjectName: subjects.name,
      semesterName: semesters.name,
      yearName: years.name,
      branchId: branches.id,
      branchName: branches.name,
    })
    .from(resources)
    .innerJoin(subjects, eq(resources.subjectId, subjects.id))
    .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
    .innerJoin(years, eq(semesters.yearId, years.id))
    .innerJoin(branches, eq(years.branchId, branches.id));
}

export interface ResourceFilters {
  branchId?: number;
  yearId?: number;
  semesterId?: number;
  subjectId?: number;
  resourceType?: string;
  isVerified?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  query?: string;
}

export function buildResourceFilters(filters: ResourceFilters): SQL | undefined {
  const clauses: SQL[] = [];
  if (filters.branchId !== undefined) clauses.push(eq(branches.id, filters.branchId));
  if (filters.yearId !== undefined) clauses.push(eq(years.id, filters.yearId));
  if (filters.semesterId !== undefined) clauses.push(eq(semesters.id, filters.semesterId));
  if (filters.subjectId !== undefined) clauses.push(eq(subjects.id, filters.subjectId));
  if (filters.resourceType !== undefined)
    clauses.push(eq(resources.resourceType, filters.resourceType as (typeof resources.resourceType)["_"]["data"]));
  if (filters.isVerified !== undefined) clauses.push(eq(resources.isVerified, filters.isVerified));
  if (filters.isNew !== undefined) clauses.push(eq(resources.isNew, filters.isNew));
  if (filters.isFeatured !== undefined) clauses.push(eq(resources.isFeatured, filters.isFeatured));
  if (filters.query) {
    const like = `%${filters.query}%`;
    const textMatch = or(ilike(resources.title, like), ilike(resources.description, like));
    if (textMatch) clauses.push(textMatch);
  }
  return clauses.length > 0 ? and(...clauses) : undefined;
}

export { sql };
