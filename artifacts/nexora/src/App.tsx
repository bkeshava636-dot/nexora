import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, Redirect, Route, Switch, Router as WouterRouter, useLocation, useParams } from "wouter";
import {
  ArrowRight, BarChart3, BadgeCheck, BookOpen, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleAlert, Clock3, ExternalLink, FileText, Filter, FolderOpen, GraduationCap, Layers3,
  LayoutDashboard, LibraryBig, Link2, Loader2, Lock, LogOut, Menu, MoreHorizontal, Plus, Search, Send, ShieldCheck,
  SlidersHorizontal, Sparkles, Trash2, Upload, Users, X,
} from "lucide-react";
import { ApiWakeOverlay } from "@/components/api-wake-overlay";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MutationCache, QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  getListBranchesQueryKey,
  getListSemestersQueryKey,
  getListSubjectsQueryKey,
  getListYearsQueryKey,
  useApproveSubmission,
  useCreateBranch,
  useCreateSemester,
  useCreateSubject,
  useCreateSubmission,
  useCreateYear,
  useDeleteBranch,
  useDeleteResource,
  useDeleteSemester,
  useDeleteSubject,
  useDeleteYear,
  useGetBranch,
  useGetSemester,
  useGetSubject,
  useGetYear,
  useListBranches,
  useListResources,
  useListSemesters,
  useListSubjects,
  useListSubmissions,
  useListYears,
  useRejectSubmission,
  useReorderBranches,
  useReorderSemesters,
  useReorderYears,
  useUpdateBranch,
  useUpdateResource,
  useUpdateSemester,
  useUpdateSubject,
  useUpdateYear,
  type Branch,
  type Resource,
  type ResourceType,
  type Semester,
  type Submission,
  type Subject,
  type Year,
} from "@workspace/api-client-react";
import { formatDate } from "./data";
import { googleDriveUrlHint, isValidGoogleDriveUrl } from "./lib/google-drive";
import { AuthProvider, useAuth } from "./lib/auth-context";

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const errObj = error as Record<string, unknown>;
    const status = typeof errObj.status === "number" ? errObj.status : 0;
    if (status >= 500) {
      return "Something went wrong. Please try again.";
    }
    const data = errObj.data;
    if (data && typeof data === "object") {
      const dataObj = data as Record<string, unknown>;
      if (typeof dataObj.message === "string" && dataObj.message.trim()) {
        const msg = dataObj.message.trim();
        if (!msg.startsWith("[") && !msg.startsWith("{") && !msg.includes("Internal Server Error")) {
          return msg;
        }
      }
    }
    if (status === 409) return "A record with these values already exists.";
    if (status === 404) return "The requested item could not be found.";
    if (status === 401 || status === 403) return "You do not have permission to perform this action.";
    if (status === 400 && typeof errObj.message === "string" && !errObj.message.includes("HTTP")) {
      return errObj.message;
    }
  }
  return "Something went wrong. Please try again.";
}

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    // Global feedback for every mutation (create/update/delete/reorder,
    // approve/reject, login) so failures are never silent, without having to
    // wire an onError into each individual call site.
    onError: (error, _variables, _context, mutation) => {
      // Login failures already get an inline message on the login form —
      // avoid double-reporting the same error via a toast too.
      if (mutation.options.mutationKey?.[0] === "login") return;
      const message = getErrorMessage(error);
      toast({ variant: "destructive", title: "That didn't go through", description: message });
    },
  }),
});
const resourceTypes: ResourceType[] = ["Lecture notes", "Previous year paper", "Lab manual", "Assignment", "Reference"];
const resourceTypeSections: Array<{ type: ResourceType; label: string }> = [
  { type: "Lecture notes", label: "Notes" },
  { type: "Previous year paper", label: "PYQs" },
  { type: "Lab manual", label: "Lab manuals" },
  { type: "Assignment", label: "Assignments" },
  { type: "Reference", label: "Study materials" },
];

// The generated hooks' `query` option type requires `queryKey` even though the
// hooks themselves always supply one internally (see getXQueryOptions in the
// generated file) — this narrow cast keeps call sites readable without
// fighting that mismatch at every call site.
function qOpts(enabled: boolean) {
  return { query: { enabled } } as unknown as { query?: never };
}

function Logo({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="focus-ring flex items-center gap-2.5" data-testid="link-logo">
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-sm">
      <Layers3 size={19} strokeWidth={2.4} />
    </span>
    {!compact && <span className="display-font text-[1.35rem] font-bold tracking-[-.04em]">nexora<span className="text-[hsl(var(--secondary))]">.</span></span>}
  </Link>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/resources", label: "Resource library", icon: LibraryBig },
    { href: "/contribute", label: "Contribute", icon: Upload },
  ];
  return <div className="noise nexora-shell min-h-[100dvh] text-[hsl(var(--foreground))]">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))] md:flex">
      <div className="px-2"><Logo /></div>
      <div className="mt-12 px-2 micro-label text-[hsl(var(--sidebar-foreground)/.45)]">Your study desk</div>
      <nav className="mt-3 space-y-1" aria-label="Main navigation">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? location === "/" : location.startsWith(href);
          return <Link href={href} key={href} className={`focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${active ? "bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]" : "text-[hsl(var(--sidebar-foreground)/.68)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(" ", "-")}`}>
            <Icon size={17} /><span>{label}</span>{active && <ChevronRight size={15} className="ml-auto" />}
          </Link>;
        })}
      </nav>
      <div className="mt-auto rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.55)] p-4">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><Sparkles size={16} /></div>
        <p className="text-sm font-semibold">Have something useful?</p>
        <p className="mt-1 text-xs leading-5 text-[hsl(var(--sidebar-foreground)/.6)]">Share it with the next person looking for exactly that.</p>
        <Link href="/contribute" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--sidebar-primary))]" data-testid="link-sidebar-contribute">Share a resource <ArrowRight size={13} /></Link>
      </div>
    </aside>
    <div className="md:pl-[236px]">
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/.9)] px-4 backdrop-blur-md sm:px-7">
        <div className="md:hidden"><Logo compact /></div>
        <div className="hidden md:block"><p className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{location.startsWith("/admin") ? "Nexora workspace / Admin" : "Nexora workspace"}</p></div>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="focus-ring hidden items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] sm:flex" data-testid="link-admin"><ShieldCheck size={15} /> Admin view</Link>
          <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="focus-ring rounded-lg p-2 md:hidden" aria-label="Open navigation" data-testid="button-open-navigation">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-[hsl(var(--primary-foreground))]" aria-label="Student profile" data-testid="avatar-student">AK</div>
        </div>
      </header>
      {mobileOpen && <div className="absolute inset-x-0 top-[68px] z-20 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-lg md:hidden">
        {nav.map(({ href, label, icon: Icon }) => <Link href={href} onClick={() => setMobileOpen(false)} key={href} className="focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))]" data-testid={`mobile-link-${label.toLowerCase().replaceAll(" ", "-")}`}><Icon size={17} />{label}</Link>)}
        <Link href="/admin" onClick={() => setMobileOpen(false)} className="focus-ring flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-[hsl(var(--muted))]" data-testid="mobile-link-admin"><ShieldCheck size={17} />Admin view</Link>
      </div>}
      <main className="nexora-main min-h-[calc(100dvh-68px)]">{children}</main>
    </div>
  </div>;
}

function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <div className="mb-5 flex items-end justify-between gap-4">
    <div>{eyebrow && <p className="micro-label mb-2 text-[hsl(var(--accent-foreground))]">{eyebrow}</p>}<h2 className="display-font text-2xl font-bold tracking-[-.035em] text-[hsl(var(--foreground))] sm:text-3xl">{title}</h2></div>
    {action}
  </div>;
}

function VerifiedBadge({ verified = true }: { verified?: boolean }) {
  return verified ? <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--accent))] px-2 py-1 text-[10px] font-bold text-[hsl(var(--accent-foreground))]" data-testid="badge-verified"><BadgeCheck size={12} /> Verified</span> : <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]" data-testid="badge-unverified">Unverified</span>;
}

function ResourceIcon({ type }: { type: ResourceType }) {
  const Icon = type === "Previous year paper" ? FileText : type === "Lab manual" ? BookOpen : type === "Assignment" ? ClipboardIcon : FolderOpen;
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><Icon size={18} /></span>;
}
function ClipboardIcon({ size = 18 }: { size?: number }) { return <FileText size={size} />; }

function ResourceCard({ resource, compact = false }: { resource: Resource; compact?: boolean }) {
  return <a href={resource.googleDriveUrl} target="_blank" rel="noreferrer" className={`card-lift focus-ring group block rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 ${compact ? "" : "p-5"}`} data-testid={`card-resource-${resource.id}`}>
    <div className="flex items-start gap-3"><ResourceIcon type={resource.resourceType} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">{resource.resourceType}</span>{resource.isNew && <span className="rounded-full bg-[hsl(var(--secondary)/.22)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">New</span>}{resource.isFeatured && <span className="rounded-full bg-[hsl(var(--accent)/.8)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--accent-foreground))]">Featured</span>}</div><h3 className="mt-1 line-clamp-2 text-sm font-bold leading-5 group-hover:text-[hsl(var(--accent-foreground))]">{resource.title}</h3></div><ExternalLink size={15} className="shrink-0 text-[hsl(var(--muted-foreground))]" /></div>
    {!compact && <p className="mt-3 line-clamp-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{resource.description}</p>}
    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[hsl(var(--border))] pt-3"><span className="truncate text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">{resource.branchName} · {resource.yearName} · {resource.semesterName}</span><VerifiedBadge verified={resource.isVerified} /></div>
  </a>;
}

function ResourceTypeGroups({ resources, compact = false }: { resources: Resource[]; compact?: boolean }) {
  return <div className="space-y-8">
    {resourceTypeSections.map(({ type, label }) => {
      const group = resources.filter((resource) => resource.resourceType === type);
      if (!group.length) return null;
      return <section key={type} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.45)] p-4 sm:p-5" data-testid={`resource-type-section-${type.toLowerCase().replaceAll(" ", "-")}`}>
        <div className="mb-4 flex items-end justify-between gap-4 border-b border-[hsl(var(--border))] pb-3"><div><p className="micro-label text-[hsl(var(--accent-foreground))]">Resource type</p><h2 className="mt-1 text-lg font-bold">{label}</h2></div><span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-[10px] font-bold text-[hsl(var(--muted-foreground))]">{group.length} {group.length === 1 ? "resource" : "resources"}</span></div>
        <div className={`grid gap-4 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>{group.map((resource) => <ResourceCard key={resource.id} resource={resource} compact={compact} />)}</div>
      </section>;
    })}
  </div>;
}

function Home() {
  const { data: resources = [], isLoading } = useListResources();
  const featured = resources.filter((resource) => resource.isFeatured).slice(0, 3);
  const latest = resources.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  return <div className="hero-wash">
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12 lg:py-16">
      <section className="soft-grid relative overflow-hidden rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-5 py-10 sm:px-10 sm:py-14 lg:px-16">
        <div className="relative max-w-2xl fade-up"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--accent-foreground))]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--secondary))]" /> Your way through engineering</div>
          <h1 className="display-font max-w-xl text-4xl font-bold leading-[1.05] tracking-[-.06em] sm:text-6xl">Find the right Resource.<br /><span className="text-[hsl(var(--accent-foreground))]">Keep moving.</span></h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">Notes, PYQs, and study materials — organized for your semester.</p>
          <div className="mt-8 max-w-xl"><SearchBox /></div>
        </div>
        <div className="absolute -right-8 -top-8 hidden h-64 w-64 rounded-full border-[18px] border-[hsl(var(--secondary)/.26)] sm:block lg:h-80 lg:w-80" /><div className="absolute right-20 top-20 hidden h-20 w-20 rounded-full bg-[hsl(var(--accent)/.8)] sm:block" />
      </section>
      <section className="mt-12 fade-up fade-up-delay-1"><SectionHeading eyebrow="Start with your path" title="What are you studying?" action={<Link href="/resources" className="focus-ring hidden items-center gap-1 text-xs font-bold text-[hsl(var(--accent-foreground))] sm:flex" data-testid="link-all-branches">View all resources <ArrowRight size={14} /></Link>} />
        <BranchGrid />
      </section>
      <section className="mt-12 fade-up fade-up-delay-2"><SectionHeading eyebrow="Handpicked" title="Featured resources" />
        {isLoading ? <LoadingGrid /> : featured.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{featured.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}</div> : <EmptyState title="Nothing featured yet" body="Once resources are marked featured, they will show up here." />}
      </section>
      <section className="mt-12 pb-10 fade-up fade-up-delay-2"><SectionHeading eyebrow="Fresh off the shelf" title="Recently added" />
        {isLoading ? <LoadingGrid count={4} /> : latest.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{latest.map((resource) => <ResourceCard compact key={resource.id} resource={resource} />)}</div> : <EmptyState title="The library is still empty" body="Be the first to contribute a resource." />}
      </section>
    </div>
  </div>;
}

function BranchGrid() {
  const { data: branches = [], isLoading } = useListBranches();
  if (isLoading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)]" />)}</div>;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{branches.map((branch) => <BranchCard key={branch.id} branch={branch} />)}</div>;
}

function BranchCard({ branch }: { branch: Branch }) {
  return <Link href={`/branch/${branch.id}`} className="card-lift focus-ring group block rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5" data-testid={`link-branch-${branch.id}`}>
    <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><GraduationCap size={20} /></span><ChevronRight size={18} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" /></div>
    <h3 className="mt-4 text-base font-bold">{branch.shortName}</h3>
    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{branch.description}</p>
    <div className="mt-4 flex gap-3 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]"><span>{branch.subjectCount} subjects</span><span>{branch.resourceCount} resources</span></div>
  </Link>;
}

function LoadingGrid({ count = 3 }: { count?: number }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: count }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)]" />)}</div>;
}

function SearchBox({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  const [, navigate] = useLocation();
  const [local, setLocal] = useState(value ?? "");
  const controlled = value !== undefined;
  const current = controlled ? value : local;
  const submit = (event: FormEvent) => { event.preventDefault(); if (!controlled) navigate(`/resources?query=${encodeURIComponent(current ?? "")}`); };
  return <form onSubmit={submit} className="relative">
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={18} />
    <input value={current} onChange={(e) => { controlled ? onChange?.(e.target.value) : setLocal(e.target.value); }} className="input-style h-14 pl-12 pr-4 text-sm shadow-sm" placeholder="Search notes, papers, subjects..." data-testid="input-search" />
  </form>;
}

function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]" aria-label="Breadcrumb">
    {items.map((item, i) => <span key={item.label} className="flex items-center gap-1.5">
      {item.href ? <Link href={item.href} className="focus-ring hover:text-[hsl(var(--foreground))]" data-testid={`link-breadcrumb-${i}`}>{item.label}</Link> : <span className="text-[hsl(var(--foreground))]">{item.label}</span>}
      {i < items.length - 1 && <ChevronRight size={12} />}
    </span>)}
  </nav>;
}

function ResourcesPage() {
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("query") ?? "");
  const [branch, setBranch] = useState("All branches");
  const [year, setYear] = useState("All years");
  const [semester, setSemester] = useState("All semesters");
  const [subject, setSubject] = useState("All subjects");
  const [type, setType] = useState("All types");
  const [verified, setVerified] = useState(false);
  const { data: resources = [], isLoading } = useListResources();
  const { data: branches = [] } = useListBranches();

  const years = useMemo(() => [...new Set(resources.map((r) => r.yearName).filter((v): v is string => !!v))], [resources]);
  const semesters = useMemo(() => [...new Set(resources.map((r) => r.semesterName).filter((v): v is string => !!v))], [resources]);
  const subjectNames = useMemo(() => [...new Set(resources.map((r) => r.subjectName).filter((v): v is string => !!v))], [resources]);

  const filtered = useMemo(() => resources.filter((resource) => {
    const haystack = `${resource.title} ${resource.subjectName} ${resource.description} ${resource.branchName}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (branch === "All branches" || resource.branchName === branch) && (year === "All years" || resource.yearName === year) && (semester === "All semesters" || resource.semesterName === semester) && (subject === "All subjects" || resource.subjectName === subject) && (type === "All types" || resource.resourceType === type) && (!verified || resource.isVerified);
  }), [resources, query, branch, year, semester, subject, type, verified]);

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12"><div className="mb-8"><p className="micro-label mb-2 text-[hsl(var(--accent-foreground))]">The shelf</p><h1 className="display-font text-4xl font-bold tracking-[-.05em] sm:text-5xl">Resource library</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Everything is sorted by academic path, so you can spend less time hunting and more time understanding.</p></div>
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-3 sm:p-4"><SearchBox value={query} onChange={setQuery} /><div className="mt-3 flex gap-2 overflow-x-auto pb-1 mobile-scroll"><SelectPill label={branch} options={["All branches", ...branches.map((item) => item.shortName)]} onChange={setBranch} testId="select-branch-filter" /><SelectPill label={year} options={["All years", ...years]} onChange={setYear} testId="select-year-filter" /><SelectPill label={semester} options={["All semesters", ...semesters]} onChange={setSemester} testId="select-semester-filter" /><SelectPill label={subject} options={["All subjects", ...subjectNames]} onChange={setSubject} testId="select-subject-filter" /><SelectPill label={type} options={["All types", ...resourceTypes]} onChange={setType} testId="select-type-filter" /><button type="button" onClick={() => setVerified(!verified)} className={`focus-ring flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${verified ? "border-[hsl(var(--accent-foreground))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]" : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]"}`} data-testid="button-filter-verified"><BadgeCheck size={14} /> Verified only</button></div></div>
    <div className="mt-8 flex items-center justify-between"><p className="text-sm font-semibold">{filtered.length} <span className="font-normal text-[hsl(var(--muted-foreground))]">resources found</span></p><span className="hidden items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] sm:flex"><SlidersHorizontal size={14} /> Showing your filters</span></div>
    {isLoading ? <LoadingGrid count={6} /> : filtered.length ? <div className="mt-4"><ResourceTypeGroups resources={filtered} /></div> : <EmptyState title="No resources match that search" body="Try a broader subject, branch, or resource type. You can also contribute what you were looking for." action={<Link href="/contribute" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-empty-contribute">Share a resource <ArrowRight size={14} /></Link>} />}
  </div>;
}

function SelectPill({ label, options, onChange, testId }: { label: string; options: string[]; onChange: (value: string) => void; testId: string }) {
  return <label className="relative flex shrink-0 items-center"><span className="sr-only">{label}</span><select value={label} onChange={(event) => onChange(event.target.value)} className="focus-ring appearance-none rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2 pl-3 pr-8 text-xs font-bold text-[hsl(var(--foreground))]" data-testid={testId}>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-2.5" /></label>;
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="my-8 rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.58)] px-5 py-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><FolderOpen size={22} /></div><h2 className="mt-4 text-base font-bold">{title}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">{body}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function BranchPage() {
  const { branchId = "" } = useParams<{ branchId: string }>();
  const id = Number(branchId);
  const validId = Number.isFinite(id);
  const { data: branch, isLoading: branchLoading, isError: branchError } = useGetBranch(id, qOpts(validId));
  const { data: years = [] } = useListYears({ branchId: id }, qOpts(validId));
  const { data: allSemesters = [] } = useListSemesters();
  const { data: allSubjects = [] } = useListSubjects();
  const { data: resources = [] } = useListResources({ branchId: id }, qOpts(validId));

  if (!validId || branchError) return <NotFound />;
  if (branchLoading || !branch) return <div className="mx-auto max-w-6xl px-4 py-24"><Loader2 className="mx-auto animate-spin text-[hsl(var(--muted-foreground))]" size={28} /></div>;

  const yearIds = new Set(years.map((y) => y.id));
  const semestersInBranch = allSemesters.filter((s) => yearIds.has(s.yearId));
  const semesterIds = new Set(semestersInBranch.map((s) => s.id));
  const branchSubjects = allSubjects.filter((s) => semesterIds.has(s.semesterId));
  const subjectsBySemester = (semesterId: number) => branchSubjects.filter((s) => s.semesterId === semesterId);
  const semestersInYear = (yearId: number) => semestersInBranch.filter((s) => s.yearId === yearId);

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: branch.shortName }]} /><section className="relative overflow-hidden rounded-3xl bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] sm:p-10"><div className="relative z-10 max-w-2xl"><p className="micro-label mb-3 text-[hsl(var(--secondary))]">{branch.shortName} · Academic path</p><h1 className="display-font text-4xl font-bold tracking-[-.05em] sm:text-5xl">{branch.name}</h1><p className="mt-4 max-w-lg text-sm leading-6 text-[hsl(var(--primary-foreground)/.7)]">{branch.description}</p><div className="mt-7 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-[hsl(var(--primary-foreground)/.12)] px-3 py-2">{branch.subjectCount} subjects</span><span className="rounded-full bg-[hsl(var(--primary-foreground)/.12)] px-3 py-2">{branch.resourceCount} resources</span></div></div><div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[22px] border-[hsl(var(--secondary)/.3)]" /></section><section className="mt-10"><SectionHeading eyebrow="Choose your year" title="A clear path through the semesters" /><div className="space-y-4">{years.map((yearItem) => <div key={yearItem.id} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.76)] p-5 sm:p-6"><div className="flex items-center justify-between"><div><span className="micro-label text-[hsl(var(--accent-foreground))]">{yearItem.name}</span></div><span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-[10px] font-bold text-[hsl(var(--muted-foreground))]">{semestersInYear(yearItem.id).reduce((sum, s) => sum + subjectsBySemester(s.id).length, 0)} subjects</span></div><div className="mt-5 space-y-5">{semestersInYear(yearItem.id).map((semesterItem) => <div key={semesterItem.id}><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[hsl(var(--muted-foreground))]">{semesterItem.name}</p><div className="mt-2 grid gap-3 sm:grid-cols-2">{subjectsBySemester(semesterItem.id).map((subject) => <Link href={`/subject/${subject.id}`} key={subject.id} className="card-lift focus-ring flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4" data-testid={`link-subject-${subject.id}`}><h3 className="text-sm font-bold">{subject.name}</h3><ChevronRight size={17} className="text-[hsl(var(--muted-foreground))]" /></Link>)}</div></div>)}</div></div>)}</div></section><section className="mt-10 pb-10"><SectionHeading eyebrow="A quick look" title="Latest from this branch" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{resources.slice(0, 3).map((resource) => <ResourceCard compact key={resource.id} resource={resource} />)}</div></section></div>;
}

function SubjectPage() {
  const { subjectId = "" } = useParams<{ subjectId: string }>();
  const id = Number(subjectId);
  const validId = Number.isFinite(id);
  const { data: subject, isLoading: subjectLoading, isError: subjectError } = useGetSubject(id, qOpts(validId));
  const { data: semester } = useGetSemester(subject?.semesterId as number, qOpts(!!subject));
  const { data: year } = useGetYear(semester?.yearId as number, qOpts(!!semester));
  const { data: branch } = useGetBranch(year?.branchId as number, qOpts(!!year));
  const { data: resources = [] } = useListResources({ subjectId: id }, qOpts(validId));

  if (!validId || subjectError) return <NotFound />;
  if (subjectLoading || !subject) return <div className="mx-auto max-w-5xl px-4 py-24"><Loader2 className="mx-auto animate-spin text-[hsl(var(--muted-foreground))]" size={28} /></div>;

  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-7 sm:py-12"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: branch?.shortName ?? "Branch", href: year ? `/branch/${year.branchId}` : undefined }, { label: subject.name }]} /><section className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.78)] p-6 sm:p-9"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="micro-label mb-3 text-[hsl(var(--accent-foreground))]">{branch?.shortName ?? "…"} · {year?.name ?? "…"} · {semester?.name ?? "…"}</p><h1 className="display-font text-4xl font-bold tracking-[-.05em] sm:text-5xl">{subject.name}</h1><p className="mt-4 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{subject.description}</p></div><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><BookOpen size={25} /></span></div></section><div className="mt-10"><SectionHeading eyebrow={`${resources.length} resources`} title="Your subject shelf" action={<Link href="/contribute" className="focus-ring flex items-center gap-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold" data-testid="link-contribute-subject"><Plus size={14} /> Add one</Link>} />{resources.length ? <ResourceTypeGroups resources={resources} /> : <EmptyState title="This shelf is waiting for its first resource" body="If you have notes or a paper for this subject, you can be the person who starts it." action={<Link href="/contribute" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-empty-subject-contribute"><Upload size={14} /> Contribute material</Link>} />}</div></div>;
}

function ContributePage() {
  const [submitted, setSubmitted] = useState(false);
  const [branchId, setBranchId] = useState<number | undefined>(undefined);
  const [yearId, setYearId] = useState<number | undefined>(undefined);
  const [semesterId, setSemesterId] = useState<number | undefined>(undefined);
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);
  const [form, setForm] = useState({ resourceType: "Lecture notes" as ResourceType, title: "", description: "", googleDriveUrl: "", studentName: "", studentEmail: "" });
  const [error, setError] = useState("");
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const { data: branches = [] } = useListBranches();
  const { data: years = [] } = useListYears({ branchId: branchId as number }, qOpts(!!branchId));
  const { data: semesters = [] } = useListSemesters({ yearId: yearId as number }, qOpts(!!yearId));
  const { data: subjects = [] } = useListSubjects({ semesterId: semesterId as number }, qOpts(!!semesterId));
  const createSubmission = useCreateSubmission();

  useEffect(() => { if (branches.length && branchId === undefined) setBranchId(branches[0]?.id); }, [branches, branchId]);
  useEffect(() => { if (years.length) setYearId((current) => current && years.some((y) => y.id === current) ? current : years[0]?.id); else setYearId(undefined); }, [years]);
  useEffect(() => { if (semesters.length) setSemesterId((current) => current && semesters.some((s) => s.id === current) ? current : semesters[0]?.id); else setSemesterId(undefined); }, [semesters]);
  useEffect(() => { if (subjects.length) setSubjectId((current) => current && subjects.some((s) => s.id === current) ? current : subjects[0]?.id); else setSubjectId(undefined); }, [subjects]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim() || !form.studentName.trim() || !form.studentEmail.trim()) { setError("Please fill in the required fields before sending."); return; }
    if (!form.googleDriveUrl.trim()) { setError("Please paste a Google Drive link."); return; }
    if (!isValidGoogleDriveUrl(form.googleDriveUrl)) { setError(`That doesn't look like a valid Google link. ${googleDriveUrlHint}`); return; }
    if (!subjectId) { setError("Please choose a branch, year, semester, and subject before sending."); return; }
    createSubmission.mutate({ data: { ...form, branchId, yearId, semesterId, subjectId } }, {
      onSuccess: () => { setSubmitted(true); setError(""); },
      onError: () => { setError("Something went wrong sending this. Please try again."); },
    });
  };

  if (submitted) return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-7 sm:py-20"><div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-14 text-center sm:px-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><CheckCircle2 size={32} /></div><p className="micro-label mt-6 text-[hsl(var(--accent-foreground))]">In the review queue</p><h1 className="display-font mt-2 text-4xl font-bold tracking-[-.05em]">Thank you for sharing.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">Our student editors will check the link and details before it joins Nexora. That keeps the Verified badge meaningful for everyone.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/resources" className="focus-ring rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-confirmation-library">Browse the library</Link><button type="button" onClick={() => { setSubmitted(false); setForm({ ...form, title: "", description: "", googleDriveUrl: "" }); }} className="focus-ring rounded-xl border border-[hsl(var(--border))] px-5 py-3 text-sm font-bold" data-testid="button-submit-another">Share another</button></div></div></div>;
  return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-7 sm:py-12"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contribute" }]} /><div className="mb-8 max-w-2xl"><p className="micro-label mb-2 text-[hsl(var(--accent-foreground))]">Give back a little</p><h1 className="display-font text-4xl font-bold tracking-[-.05em] sm:text-5xl">Put a useful file<br />in the right hands.</h1><p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Share material you trust. We review every submission before it becomes part of the library.</p></div><form onSubmit={submit} className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.78)] p-5 sm:p-8"><FormSection title="Where does it belong?"><div className="grid gap-4 sm:grid-cols-2"><Field label="Branch" required><select value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value))} className="input-style" data-testid="select-contribution-branch">{branches.map((item) => <option key={item.id} value={item.id}>{item.shortName} — {item.name}</option>)}</select></Field><Field label="Subject" required><select value={subjectId ?? ""} onChange={(e) => setSubjectId(Number(e.target.value))} className="input-style" data-testid="select-contribution-subject">{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Year" required><select value={yearId ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="input-style" data-testid="select-contribution-year">{years.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Semester" required><select value={semesterId ?? ""} onChange={(e) => setSemesterId(Number(e.target.value))} className="input-style" data-testid="select-contribution-semester">{semesters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div></FormSection><FormSection title="Tell us about it"><div className="grid gap-4"><Field label="Resource type" required><select value={form.resourceType} onChange={(e) => update("resourceType", e.target.value)} className="input-style" data-testid="select-contribution-type">{resourceTypes.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Title" required><input value={form.title} onChange={(e) => update("title", e.target.value)} className="input-style" placeholder="e.g. Data Structures revision notes" data-testid="input-contribution-title" /></Field><Field label="Short description"><textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="input-style min-h-24 resize-y" placeholder="What will a student find inside?" data-testid="textarea-contribution-description" /></Field><Field label="Google Drive link" required hint={`${googleDriveUrlHint} Also make sure link access is set to "Anyone with the link".`}><div className="relative"><Link2 className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" size={16} /><input value={form.googleDriveUrl} onChange={(e) => update("googleDriveUrl", e.target.value)} className="input-style pl-10" placeholder="https://drive.google.com/..." data-testid="input-contribution-url" /></div></Field></div></FormSection><FormSection title="A little about you"><div className="grid gap-4 sm:grid-cols-2"><Field label="Your name" required><input value={form.studentName} onChange={(e) => update("studentName", e.target.value)} className="input-style" placeholder="How should we credit you?" data-testid="input-contribution-name" /></Field><Field label="College email" required><input type="email" value={form.studentEmail} onChange={(e) => update("studentEmail", e.target.value)} className="input-style" placeholder="you@college.edu" data-testid="input-contribution-email" /></Field></div></FormSection>{error && <div className="mb-4 flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]" role="alert" data-testid="status-contribution-error"><CircleAlert size={15} className="mt-0.5 shrink-0" />{error}</div>}<div className="flex flex-col items-start justify-between gap-4 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:items-center"><p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">Submissions are checked by the Nexora student team.</p><button type="submit" disabled={createSubmission.isPending} className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-60" data-testid="button-submit-contribution">{createSubmission.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send for review</button></div></form></div>;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) { return <fieldset className="border-b border-[hsl(var(--border))] py-6 first:pt-0 last:border-0"><legend className="mb-4 text-sm font-bold">{title}</legend>{children}</fieldset>; }
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold">{label}{required && <span className="ml-1 text-[hsl(var(--destructive))]">*</span>}</span>{children}{hint && <span className="mt-1.5 block text-[11px] leading-4 text-[hsl(var(--muted-foreground))]">{hint}</span>}</label>; }

function LoginPage() {
  const { login, isLoggingIn, loginError, isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, navigate] = useLocation();

  if (isAuthenticated) return <Redirect to="/admin" />;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login({ username, password }).then(() => navigate("/admin")).catch(() => { /* surfaced via loginError */ });
  };

  return <div className="mx-auto flex min-h-[calc(100dvh-68px)] max-w-md flex-col justify-center px-4 py-12 sm:px-7">
    <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-9">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><Lock size={22} /></div>
      <h1 className="display-font mt-5 text-center text-2xl font-bold tracking-[-.04em]">Admin sign in</h1>
      <p className="mt-2 text-center text-xs leading-5 text-[hsl(var(--muted-foreground))]">Sign in to review submissions and manage the resource library.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Username" required><input value={username} onChange={(e) => setUsername(e.target.value)} className="input-style" autoComplete="username" data-testid="input-login-username" /></Field>
        <Field label="Password" required><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-style" autoComplete="current-password" data-testid="input-login-password" /></Field>
        {loginError && <div className="flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]" role="alert" data-testid="status-login-error"><CircleAlert size={15} className="mt-0.5 shrink-0" />{loginError}</div>}
        <button type="submit" disabled={isLoggingIn} className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-60" data-testid="button-login-submit">{isLoggingIn ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Sign in</button>
      </form>
    </div>
  </div>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-24"><Loader2 className="mx-auto animate-spin text-[hsl(var(--muted-foreground))]" size={28} /></div>;
  // The frontend redirect here is purely for UX (no flash of admin UI) — every
  // admin API call is independently rejected server-side (requireAdmin
  // middleware) regardless of what the client shows, so this alone is never
  // the thing standing between an unauthenticated request and admin data.
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <>{children}</>;
}

function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { username, logout } = useAuth();
  const tabs = [
    { href: "/admin", label: "Overview", testId: "link-admin-overview" },
    { href: "/admin/catalog", label: "Catalog", testId: "link-admin-catalog" },
    { href: "/admin/submissions", label: "Submissions", testId: "link-admin-submissions" },
    { href: "/admin/resources", label: "Resources", testId: "link-admin-resources" },
  ];
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12"><div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="mb-3 flex items-center gap-2 text-xs font-bold text-[hsl(var(--muted-foreground))]"><ShieldCheck size={15} /> Editorial workspace{username && <span className="font-normal text-[hsl(var(--muted-foreground)/.8)]">· signed in as {username}</span>}</div><h1 className="display-font text-4xl font-bold tracking-[-.05em]">Keep the shelf trustworthy.</h1><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Review, organize, and keep the signal high.</p></div><div className="flex shrink-0 gap-2"><Link href="/contribute" className="focus-ring inline-flex w-fit items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-xs font-bold" data-testid="link-admin-contribute"><Plus size={15} /> Add resource</Link><button type="button" onClick={logout} className="focus-ring inline-flex w-fit items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]" data-testid="button-logout"><LogOut size={15} /> Log out</button></div></div><div className="mb-8 flex gap-1 overflow-x-auto border-b border-[hsl(var(--border))] mobile-scroll">{tabs.map((tab) => <Link key={tab.href} href={tab.href} className={`focus-ring shrink-0 border-b-2 px-3 py-3 text-xs font-bold ${location === tab.href ? "border-[hsl(var(--secondary))] text-[hsl(var(--foreground))]" : "border-transparent text-[hsl(var(--muted-foreground))]"}`} data-testid={tab.testId}>{tab.label}</Link>)}</div>{children}</div>;
}

function AdminCatalog() {
  const [branchId, setBranchId] = useState<number | undefined>(undefined);
  const [yearId, setYearId] = useState<number | undefined>(undefined);
  const [semesterId, setSemesterId] = useState<number | undefined>(undefined);
  const { data: branches = [] } = useListBranches({ includeInactive: true });
  const { data: years = [] } = useListYears({ branchId: branchId as number }, qOpts(!!branchId));
  const { data: semesters = [] } = useListSemesters({ yearId: yearId as number }, qOpts(!!yearId));

  useEffect(() => { if (!branchId && branches.length) setBranchId(branches[0]?.id); }, [branches, branchId]);
  useEffect(() => { setYearId(undefined); setSemesterId(undefined); }, [branchId]);
  useEffect(() => { setSemesterId(undefined); }, [yearId]);
  useEffect(() => {
    if (years.length) {
      setYearId((current) => current && years.some((year) => year.id === current) ? current : years[0]?.id);
    }
  }, [years]);
  useEffect(() => {
    if (semesters.length) {
      setSemesterId((current) => current && semesters.some((semester) => semester.id === current) ? current : semesters[0]?.id);
    }
  }, [semesters]);

  const selectedBranch = branches.find((branch) => branch.id === branchId);
  const selectedYear = years.find((year) => year.id === yearId);

  return <div className="space-y-6">
    <BranchManager branches={branches} selectedId={branchId} onSelect={setBranchId} />
    {branchId && <YearManager branchId={branchId} years={years} selectedId={yearId} onSelect={setYearId} />}
    {yearId && <SemesterManager yearId={yearId} semesters={semesters} selectedId={semesterId} onSelect={setSemesterId} />}
    {semesterId && selectedBranch && selectedYear && <SubjectManager branch={selectedBranch} year={selectedYear} semesters={semesters} semesterId={semesterId} onSelectSemester={setSemesterId} />}
  </div>;
}

function CatalogPanel({ title, subtitle, children, addForm }: { title: string; subtitle: string; children: ReactNode; addForm: ReactNode }) {
  return <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
    <div className="mb-4"><h3 className="text-sm font-bold">{title}</h3><p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">{subtitle}</p></div>
    <div className="space-y-2">{children}</div>
    {addForm}
  </div>;
}

function AddRow({ children, onSubmit, pending, testId }: { children: ReactNode; onSubmit: () => void; pending: boolean; testId: string }) {
  return <form onSubmit={(e) => { e.preventDefault(); if (!pending) onSubmit(); }} className="mt-3 flex flex-wrap items-end gap-2 border-t border-[hsl(var(--border))] pt-3">
    {children}
    <button type="submit" disabled={pending} className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60" data-testid={testId}>{pending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add</button>
  </form>;
}

function CatalogRow({ label, sublabel, active, onSelect, onMoveUp, onMoveDown, onEdit, onDelete, extra, isEditing = false, isDeleting = false, isMoving = false, disabled = false }: {
  label: string; sublabel?: string; active?: boolean; onSelect?: () => void; onMoveUp?: () => void; onMoveDown?: () => void; onEdit: () => void; onDelete: () => void; extra?: ReactNode;
  isEditing?: boolean; isDeleting?: boolean; isMoving?: boolean; disabled?: boolean;
}) {
  return <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${active ? "border-[hsl(var(--accent-foreground))] bg-[hsl(var(--accent))]" : "border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)]"}`}>
    {(onMoveUp || onMoveDown) && <div className="flex shrink-0 flex-col"><button type="button" disabled={disabled || isMoving} onClick={onMoveUp} className="focus-ring text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-40" aria-label={`Move ${label} up`}>{isMoving ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} className="rotate-180" />}</button><button type="button" disabled={disabled || isMoving} onClick={onMoveDown} className="focus-ring text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-40" aria-label={`Move ${label} down`}>{isMoving ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}</button></div>}
    <button type="button" onClick={onSelect} className="focus-ring flex-1 truncate text-left font-semibold" data-testid={`button-select-${label.toLowerCase().replaceAll(/\s+/g, "-")}`}>{label}{sublabel && <span className="ml-2 text-[11px] font-normal text-[hsl(var(--muted-foreground))]">{sublabel}</span>}</button>
    {extra}
    <button type="button" disabled={disabled || isEditing || isDeleting} onClick={onEdit} className="focus-ring shrink-0 rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-50" aria-label={`Edit ${label}`}>{isEditing ? <Loader2 size={14} className="animate-spin" /> : <SlidersHorizontal size={14} />}</button>
    <button type="button" disabled={disabled || isDeleting || isEditing} onClick={onDelete} className="focus-ring shrink-0 rounded-lg p-1.5 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)] disabled:opacity-50" aria-label={`Delete ${label}`}>{isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}</button>
  </div>;
}

function BranchManager({ branches, selectedId, onSelect }: { branches: Branch[]; selectedId?: number; onSelect: (id: number) => void }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: getListBranchesQueryKey() });
  const create = useCreateBranch({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Branch added" }); } } });
  const update = useUpdateBranch({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Branch updated" }); } } });
  const remove = useDeleteBranch({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Branch deleted" }); } } });
  const reorder = useReorderBranches({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Branch order updated" }); } } });
  const [name, setName] = useState(""); const [shortName, setShortName] = useState("");

  const move = (branch: Branch, direction: -1 | 1) => {
    if (reorder.isPending) return;
    const sorted = [...branches].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((b) => b.id === branch.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    reorder.mutate({ data: { order: [{ id: branch.id, displayOrder: swapWith.displayOrder }, { id: swapWith.id, displayOrder: branch.displayOrder }] } });
  };
  const edit = (branch: Branch) => {
    if (update.isPending || remove.isPending) return;
    const newName = window.prompt("Branch name", branch.name); if (newName === null) return;
    const newShort = window.prompt("Short name", branch.shortName); if (newShort === null) return;
    update.mutate({ id: branch.id, data: { name: newName, shortName: newShort } });
  };

  return <CatalogPanel title="Branches" subtitle="The top level of the academic path." addForm={<AddRow pending={create.isPending} testId="button-add-branch" onSubmit={() => { if (!name.trim() || !shortName.trim() || create.isPending) return; create.mutate({ data: { name, shortName, displayOrder: branches.length } }); setName(""); setShortName(""); }}>
    <input value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="Short name (CSE)" className="input-style h-9 w-32 text-xs" data-testid="input-branch-shortname" />
    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="input-style h-9 flex-1 text-xs" data-testid="input-branch-name" />
  </AddRow>}>
    {branches.length === 0 && <p className="text-xs text-[hsl(var(--muted-foreground))]">No branches yet — add the first one below.</p>}
    {[...branches].sort((a, b) => a.displayOrder - b.displayOrder).map((branch) => {
      const isEditing = update.isPending && update.variables?.id === branch.id && (update.variables?.data?.name !== undefined || update.variables?.data?.shortName !== undefined);
      const isDeleting = remove.isPending && remove.variables?.id === branch.id;
      const isTogglingActive = update.isPending && update.variables?.id === branch.id && update.variables?.data?.isActive !== undefined;
      const isMoving = reorder.isPending && Boolean(reorder.variables?.data?.order?.some((o) => o.id === branch.id));
      return <CatalogRow
        key={branch.id}
        label={branch.shortName}
        sublabel={`${branch.subjectCount} subjects${branch.isActive ? "" : " · disabled"}`}
        active={branch.id === selectedId}
        onSelect={() => onSelect(branch.id)}
        onMoveUp={() => move(branch, -1)}
        onMoveDown={() => move(branch, 1)}
        onEdit={() => edit(branch)}
        onDelete={() => {
          if (remove.isPending || update.isPending) return;
          if (window.confirm(`Delete ${branch.shortName}? This removes its years, semesters, subjects, and resources.`)) {
            remove.mutate({ id: branch.id });
          }
        }}
        isEditing={isEditing}
        isDeleting={isDeleting}
        isMoving={isMoving}
        extra={<button
          type="button"
          disabled={update.isPending || remove.isPending}
          onClick={() => update.mutate({ id: branch.id, data: { isActive: !branch.isActive } })}
          className={`focus-ring shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold disabled:opacity-60 ${branch.isActive ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"}`}
          data-testid={`button-toggle-active-${branch.id}`}
        >
          {isTogglingActive && <Loader2 size={10} className="animate-spin" />}
          {branch.isActive ? "Active" : "Disabled"}
        </button>}
      />;
    })}
  </CatalogPanel>;
}

function YearManager({ branchId, years, selectedId, onSelect }: { branchId: number; years: Year[]; selectedId?: number; onSelect: (id: number) => void }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: getListYearsQueryKey() });
  const create = useCreateYear({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Year added" }); } } });
  const update = useUpdateYear({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Year updated" }); } } });
  const remove = useDeleteYear({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Year deleted" }); } } });
  const reorder = useReorderYears({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Year order updated" }); } } });
  const [name, setName] = useState("");

  const move = (year: Year, direction: -1 | 1) => {
    if (reorder.isPending) return;
    const sorted = [...years].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((y) => y.id === year.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    reorder.mutate({ data: { order: [{ id: year.id, displayOrder: swapWith.displayOrder }, { id: swapWith.id, displayOrder: year.displayOrder }] } });
  };
  const edit = (year: Year) => {
    if (update.isPending || remove.isPending) return;
    const newName = window.prompt("Year name", year.name);
    if (newName === null) return;
    update.mutate({ id: year.id, data: { name: newName } });
  };

  return <CatalogPanel title="Years" subtitle="Years within the selected branch." addForm={<AddRow pending={create.isPending} testId="button-add-year" onSubmit={() => { if (!name.trim() || create.isPending) return; create.mutate({ data: { branchId, name, displayOrder: years.length } }); setName(""); }}>
    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 1st Year" className="input-style h-9 flex-1 text-xs" data-testid="input-year-name" />
  </AddRow>}>
    {years.length === 0 && <p className="text-xs text-[hsl(var(--muted-foreground))]">No years yet for this branch.</p>}
    {[...years].sort((a, b) => a.displayOrder - b.displayOrder).map((year) => {
      const isEditing = update.isPending && update.variables?.id === year.id;
      const isDeleting = remove.isPending && remove.variables?.id === year.id;
      const isMoving = reorder.isPending && Boolean(reorder.variables?.data?.order?.some((o) => o.id === year.id));
      return <CatalogRow
        key={year.id}
        label={year.name}
        active={year.id === selectedId}
        onSelect={() => onSelect(year.id)}
        onMoveUp={() => move(year, -1)}
        onMoveDown={() => move(year, 1)}
        onEdit={() => edit(year)}
        onDelete={() => {
          if (remove.isPending || update.isPending) return;
          if (window.confirm(`Delete ${year.name}?`)) {
            remove.mutate({ id: year.id });
          }
        }}
        isEditing={isEditing}
        isDeleting={isDeleting}
        isMoving={isMoving}
      />;
    })}
  </CatalogPanel>;
}

function SemesterManager({ yearId, semesters, selectedId, onSelect }: { yearId: number; semesters: Semester[]; selectedId?: number; onSelect: (id: number) => void }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: getListSemestersQueryKey() });
  const create = useCreateSemester({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Semester added" }); } } });
  const update = useUpdateSemester({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Semester updated" }); } } });
  const remove = useDeleteSemester({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Semester deleted" }); } } });
  const reorder = useReorderSemesters({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Semester order updated" }); } } });
  const [name, setName] = useState("");

  const move = (semester: Semester, direction: -1 | 1) => {
    if (reorder.isPending) return;
    const sorted = [...semesters].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((s) => s.id === semester.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    reorder.mutate({ data: { order: [{ id: semester.id, displayOrder: swapWith.displayOrder }, { id: swapWith.id, displayOrder: semester.displayOrder }] } });
  };
  const edit = (semester: Semester) => {
    if (update.isPending || remove.isPending) return;
    const newName = window.prompt("Semester name", semester.name);
    if (newName === null) return;
    update.mutate({ id: semester.id, data: { name: newName } });
  };

  return <CatalogPanel title="Semesters" subtitle="Semesters within the selected year." addForm={<AddRow pending={create.isPending} testId="button-add-semester" onSubmit={() => { if (!name.trim() || create.isPending) return; create.mutate({ data: { yearId, name, displayOrder: semesters.length } }); setName(""); }}>
    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Semester 1" className="input-style h-9 flex-1 text-xs" data-testid="input-semester-name" />
  </AddRow>}>
    {semesters.length === 0 && <p className="text-xs text-[hsl(var(--muted-foreground))]">No semesters yet for this year.</p>}
    {[...semesters].sort((a, b) => a.displayOrder - b.displayOrder).map((semester) => {
      const isEditing = update.isPending && update.variables?.id === semester.id;
      const isDeleting = remove.isPending && remove.variables?.id === semester.id;
      const isMoving = reorder.isPending && Boolean(reorder.variables?.data?.order?.some((o) => o.id === semester.id));
      return <CatalogRow
        key={semester.id}
        label={semester.name}
        active={semester.id === selectedId}
        onSelect={() => onSelect(semester.id)}
        onMoveUp={() => move(semester, -1)}
        onMoveDown={() => move(semester, 1)}
        onEdit={() => edit(semester)}
        onDelete={() => {
          if (remove.isPending || update.isPending) return;
          if (window.confirm(`Delete ${semester.name}?`)) {
            remove.mutate({ id: semester.id });
          }
        }}
        isEditing={isEditing}
        isDeleting={isDeleting}
        isMoving={isMoving}
      />;
    })}
  </CatalogPanel>;
}

function SubjectManager({ branch, year, semesters, semesterId, onSelectSemester }: {
  branch: Branch;
  year: Year;
  semesters: Semester[];
  semesterId: number;
  onSelectSemester: (id: number) => void;
}) {
  const { data: subjects = [] } = useListSubjects({ semesterId });
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
  const create = useCreateSubject({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Subject added" }); } } });
  const update = useUpdateSubject({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Subject updated" }); } } });
  const remove = useDeleteSubject({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Subject deleted" }); } } });
  const [name, setName] = useState("");
  const selectedSemester = semesters.find((semester) => semester.id === semesterId);
  const context = `${branch.shortName} · ${year.name} · ${selectedSemester?.name ?? "Semester"}`;
  const edit = (subject: Subject) => {
    if (update.isPending || remove.isPending) return;
    const newName = window.prompt("Subject name", subject.name);
    if (newName === null) return;
    update.mutate({ id: subject.id, data: { name: newName } });
  };

  return <CatalogPanel title="Subjects" subtitle={`Manage subjects for ${context}. Students contribute resources to these subjects.`} addForm={<AddRow pending={create.isPending} testId="button-add-subject" onSubmit={() => { if (!name.trim() || create.isPending) return; create.mutate({ data: { semesterId, name } }); setName(""); }}>
    <select value={semesterId} onChange={(event) => onSelectSemester(Number(event.target.value))} className="input-style h-9 min-w-40 text-xs" data-testid="select-subject-parent-semester" aria-label="Parent semester">
      {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
    </select>
    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Data Structures" className="input-style h-9 flex-1 text-xs" data-testid="input-subject-name" />
  </AddRow>}>
    {subjects.length === 0 && <p className="text-xs text-[hsl(var(--muted-foreground))]">No subjects yet for this semester.</p>}
    {subjects.map((subject) => {
      const isEditing = update.isPending && update.variables?.id === subject.id;
      const isDeleting = remove.isPending && remove.variables?.id === subject.id;
      return <CatalogRow
        key={subject.id}
        label={subject.name}
        sublabel={context}
        onEdit={() => edit(subject)}
        onDelete={() => {
          if (remove.isPending || update.isPending) return;
          if (window.confirm(`Delete ${subject.name}?`)) {
            remove.mutate({ id: subject.id });
          }
        }}
        isEditing={isEditing}
        isDeleting={isDeleting}
      />;
    })}
  </CatalogPanel>;
}

function AdminOverview() {
  const { data: resources = [] } = useListResources();
  const { data: submissions = [] } = useListSubmissions();
  const pending = submissions.filter((item) => item.status === "pending").length;
  return <AdminLayout><div className="grid gap-4 sm:grid-cols-3"><Metric icon={LibraryBig} label="Published resources" value={resources.length} detail="Live on the shelf" /><Metric icon={Clock3} label="Awaiting review" value={pending} detail={pending ? "Needs your eye" : "All clear"} warm /><Metric icon={Users} label="Verified resources" value={resources.filter((r) => r.isVerified).length} detail={`of ${resources.length}`} /></div><div className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="micro-label text-[hsl(var(--accent-foreground))]">Review queue</p><h2 className="mt-1 text-lg font-bold">Recent submissions</h2></div><Link href="/admin/submissions" className="focus-ring text-xs font-bold text-[hsl(var(--accent-foreground))]" data-testid="link-overview-submissions">View queue <ArrowRight size={13} className="ml-1 inline" /></Link></div><div className="mt-5 space-y-2">{submissions.slice(0, 3).map((item) => <SubmissionRow key={item.id} submission={item} />)}</div></div><div className="rounded-2xl bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))]"><p className="micro-label text-[hsl(var(--secondary))]">Library health</p><h2 className="mt-2 text-lg font-bold">A little more signal, every week.</h2><div className="mt-7 space-y-5"><Progress label="Verified resources" value={resources.length ? Math.round((resources.filter((r) => r.isVerified).length / resources.length) * 100) : 0} /><Progress label="Featured resources" value={resources.length ? Math.round((resources.filter((r) => r.isFeatured).length / resources.length) * 100) : 0} /><Progress label="Submissions approved" value={submissions.length ? Math.round((submissions.filter((s) => s.status === "approved").length / submissions.length) * 100) : 0} /></div><Link href="/admin/resources" className="focus-ring mt-8 inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--secondary))]" data-testid="link-overview-resources">Manage resources <ArrowRight size={13} /></Link></div></div></AdminLayout>;
}
function Metric({ icon: Icon, label, value, detail, warm }: { icon: typeof LibraryBig; label: string; value: number; detail: string; warm?: boolean }) { return <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${warm ? "bg-[hsl(var(--secondary)/.3)] text-[hsl(var(--secondary-foreground))]" : "bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"}`}><Icon size={18} /></div><p className="mt-5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{label}</p><div className="mt-1 flex items-end justify-between gap-2"><p className="display-font text-3xl font-bold">{value}</p><span className="text-[10px] font-bold text-[hsl(var(--accent-foreground))]">{detail}</span></div></div>; }
function Progress({ label, value }: { label: string; value: number }) { return <div><div className="mb-2 flex justify-between text-xs font-semibold"><span className="text-[hsl(var(--primary-foreground)/.7)]">{label}</span><span>{value}%</span></div><div className="h-1.5 rounded-full bg-[hsl(var(--primary-foreground)/.15)]"><div className="h-full rounded-full bg-[hsl(var(--secondary))]" style={{ width: `${value}%` }} /></div></div>; }
function SubmissionRow({ submission, actions = false, onApprove, onReject, isApproving = false, isRejecting = false, busy }: { submission: Submission; actions?: boolean; onApprove?: () => void; onReject?: () => void; isApproving?: boolean; isRejecting?: boolean; busy?: boolean }) {
  const isBusy = busy || isApproving || isRejecting;
  return <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] p-3.5"><div className="flex items-start gap-3"><ResourceIcon type={submission.resourceType} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold">{submission.title}</h3>{submission.status === "pending" ? <span className="rounded-full bg-[hsl(var(--secondary)/.25)] px-2 py-1 text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">Pending</span> : submission.status === "approved" ? <span className="rounded-full bg-[hsl(var(--accent))] px-2 py-1 text-[10px] font-bold text-[hsl(var(--accent-foreground))]">Approved</span> : <span className="rounded-full bg-[hsl(var(--destructive)/.1)] px-2 py-1 text-[10px] font-bold text-[hsl(var(--destructive))]">Rejected</span>}</div><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{submission.studentName} · {formatDate(submission.submittedAt)}</p></div>{actions && <div className="flex shrink-0 gap-1"><button onClick={onApprove} disabled={isBusy} type="button" className="focus-ring rounded-lg bg-[hsl(var(--accent))] p-2 text-[hsl(var(--accent-foreground))] disabled:opacity-60" aria-label={`Approve ${submission.title}`} data-testid={`button-approve-${submission.id}`}>{isApproving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}</button><button onClick={onReject} disabled={isBusy} type="button" className="focus-ring rounded-lg bg-[hsl(var(--destructive)/.1)] p-2 text-[hsl(var(--destructive))] disabled:opacity-60" aria-label={`Reject ${submission.title}`} data-testid={`button-reject-${submission.id}`}>{isRejecting ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}</button></div>}</div>{actions && <p className="mt-3 border-t border-[hsl(var(--border))] pt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{submission.description || "No description provided."} <a href={submission.googleDriveUrl} target="_blank" rel="noreferrer" className="ml-1 font-bold text-[hsl(var(--accent-foreground))]" data-testid={`link-review-drive-${submission.id}`}>Open Drive link <ExternalLink size={11} className="inline" /></a></p>}
    {submission.status === "rejected" && submission.rejectionReason && <p className="mt-3 border-t border-[hsl(var(--border))] pt-3 text-xs leading-5 text-[hsl(var(--destructive))]">Reason: {submission.rejectionReason}</p>}
    {submission.status !== "pending" && submission.reviewedBy && <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">Reviewed by {submission.reviewedBy}{submission.reviewedAt ? ` on ${formatDate(submission.reviewedAt)}` : ""}</p>}</div>;
}

function AdminSubmissions() {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const { data: submissions = [], isLoading } = useListSubmissions();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["listSubmissions"] });
  const approve = useApproveSubmission({ mutation: { onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: ["listResources"] }); toast({ title: "Submission approved", description: "It's now published as a verified resource." }); } } });
  const reject = useRejectSubmission({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Submission rejected" }); } } });
  const shown = submissions.filter((item) => filter === "all" || item.status === "pending");
  const isApproving = (id: number) => approve.isPending && approve.variables?.id === id;
  const isRejecting = (id: number) => reject.isPending && reject.variables?.id === id;
  const busyId = approve.isPending ? approve.variables?.id : reject.isPending ? reject.variables?.id : undefined;
  return <AdminLayout><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold">Submission queue</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Check context and link access before approving.</p></div><div className="flex rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1"><button type="button" onClick={() => setFilter("pending")} className={`focus-ring rounded-lg px-3 py-2 text-xs font-bold ${filter === "pending" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : ""}`} data-testid="button-filter-pending">Pending</button><button type="button" onClick={() => setFilter("all")} className={`focus-ring rounded-lg px-3 py-2 text-xs font-bold ${filter === "all" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : ""}`} data-testid="button-filter-all-submissions">All</button></div></div>{isLoading ? <Loader2 className="mx-auto my-10 animate-spin text-[hsl(var(--muted-foreground))]" size={24} /> : shown.length ? <div className="space-y-3">{shown.map((submission) => <SubmissionRow key={submission.id} submission={submission} actions={submission.status === "pending"} busy={busyId === submission.id} isApproving={isApproving(submission.id)} isRejecting={isRejecting(submission.id)} onApprove={() => approve.mutate({ id: submission.id })} onReject={() => { const reason = window.prompt("Reason for rejecting this submission (optional):"); if (reason === null) return; reject.mutate({ id: submission.id, data: { rejectionReason: reason || undefined } }); }} />)}</div> : <EmptyState title="The queue is clear" body="No submissions are waiting for a review right now. A rare, satisfying moment." />}</AdminLayout>;
}

function AdminResources() {
  const [query, setQuery] = useState("");
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const { data: resources = [], isLoading } = useListResources();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["listResources"] });
  const updateResource = useUpdateResource({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Resource updated" }); } } });
  const deleteResource = useDeleteResource({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Resource deleted" }); } } });
  const filtered = resources.filter((item) => `${item.title} ${item.subjectName} ${item.branchName}`.toLowerCase().includes(query.toLowerCase()) && (!onlyNew || item.isNew) && (!onlyFeatured || item.isFeatured));
  const toggle = (resource: Resource, key: "isNew" | "isFeatured" | "isVerified") => {
    if (updateResource.isPending || deleteResource.isPending) return;
    updateResource.mutate({ id: resource.id, data: { [key]: !resource[key] } });
  };
  const remove = (id: number) => {
    if (deleteResource.isPending || updateResource.isPending) return;
    if (window.confirm("Remove this resource from the library?")) deleteResource.mutate({ id });
  };
  return <AdminLayout><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-lg font-bold">Resource management</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Control what students see on the shelf.</p></div><div className="relative sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} className="input-style h-10 pl-9" placeholder="Search resources" data-testid="input-admin-resource-search" /></div></div><div className="mt-4 flex gap-2"><ToggleButton label="New" active={onlyNew} onClick={() => setOnlyNew(!onlyNew)} testId="button-admin-filter-new" /><ToggleButton label="Featured" active={onlyFeatured} onClick={() => setOnlyFeatured(!onlyFeatured)} testId="button-admin-filter-featured" /><span className="ml-auto flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]"><Filter size={13} /> {filtered.length} shown</span></div>{isLoading ? <Loader2 className="mx-auto my-10 animate-spin text-[hsl(var(--muted-foreground))]" size={24} /> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-[hsl(var(--border))] text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]"><th className="px-3 py-3 font-bold">Resource</th><th className="px-3 py-3 font-bold">Path</th><th className="px-3 py-3 font-bold">Status</th><th className="px-3 py-3 text-right font-bold">Actions</th></tr></thead><tbody>{filtered.map((resource) => {
    const isUpdatingVerified = updateResource.isPending && updateResource.variables?.id === resource.id && updateResource.variables?.data?.isVerified !== undefined;
    const isUpdatingFeatured = updateResource.isPending && updateResource.variables?.id === resource.id && updateResource.variables?.data?.isFeatured !== undefined;
    const isUpdatingNew = updateResource.isPending && updateResource.variables?.id === resource.id && updateResource.variables?.data?.isNew !== undefined;
    const isDeleting = deleteResource.isPending && deleteResource.variables?.id === resource.id;
    const isRowBusy = isUpdatingVerified || isUpdatingFeatured || isUpdatingNew || isDeleting;
    return <tr key={resource.id} className="border-b border-[hsl(var(--border)/.7)] last:border-0"><td className="px-3 py-4"><div className="flex items-center gap-3"><ResourceIcon type={resource.resourceType} /><div><p className="max-w-[240px] truncate text-sm font-bold">{resource.title}</p><p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{resource.resourceType}</p></div></div></td><td className="px-3 py-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{resource.branchName} · {resource.yearName} · {resource.semesterName}</td><td className="px-3 py-4"><div className="flex flex-wrap gap-1">{resource.isVerified && <VerifiedBadge />}{resource.isFeatured && <span className="rounded-full bg-[hsl(var(--secondary)/.22)] px-2 py-1 text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">Featured</span>}{resource.isNew && <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-1 text-[10px] font-bold">New</span>}</div></td><td className="px-3 py-4"><div className="flex justify-end gap-1"><button type="button" disabled={isRowBusy} onClick={() => toggle(resource, "isVerified")} className="focus-ring rounded-lg p-2 text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--accent))] disabled:opacity-50" title="Toggle verified" data-testid={`button-toggle-verified-${resource.id}`}>{isUpdatingVerified ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}</button><button type="button" disabled={isRowBusy} onClick={() => toggle(resource, "isFeatured")} className="focus-ring rounded-lg p-2 text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary)/.25)] disabled:opacity-50" title="Toggle featured" data-testid={`button-toggle-featured-${resource.id}`}>{isUpdatingFeatured ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}</button><button type="button" disabled={isRowBusy} onClick={() => toggle(resource, "isNew")} className="focus-ring rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-50" title="Toggle new" data-testid={`button-toggle-new-${resource.id}`}>{isUpdatingNew ? <Loader2 size={16} className="animate-spin" /> : <MoreHorizontal size={16} />}</button><button type="button" disabled={isRowBusy} onClick={() => remove(resource.id)} className="focus-ring rounded-lg p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)] disabled:opacity-50" title="Delete resource" data-testid={`button-delete-resource-${resource.id}`}>{isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button></div></td></tr>;
  })}</tbody></table>{filtered.length === 0 && <EmptyState title="No resources found" body="Try clearing the search or filters." />}</div>}</div></AdminLayout>;
}
function ToggleButton({ label, active, onClick, testId }: { label: string; active: boolean; onClick: () => void; testId: string }) { return <button type="button" onClick={onClick} className={`focus-ring rounded-lg border px-3 py-2 text-xs font-bold ${active ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.25)]" : "border-[hsl(var(--border))]"}`} data-testid={testId}>{label}</button>; }

function NotFound() { return <div className="mx-auto max-w-xl px-5 py-24 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--muted))]"><CircleAlert size={25} /></div><h1 className="display-font mt-5 text-4xl font-bold">That path is empty.</h1><p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">The page you were looking for has moved or never made it into the library.</p><Link href="/" className="focus-ring mt-6 inline-flex rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-not-found-home">Back to home</Link></div>; }

function RoutedErrorBoundary({ children }: { children: ReactNode }) { const [location] = useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }

function AppRouter() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/"><Home /></Route>
    <Route path="/resources"><ResourcesPage /></Route>
    <Route path="/branch/:branchId"><BranchPage /></Route>
    <Route path="/subject/:subjectId"><SubjectPage /></Route>
    <Route path="/contribute"><ContributePage /></Route>
    <Route path="/login"><LoginPage /></Route>
    <Route path="/admin"><RequireAdmin><AdminOverview /></RequireAdmin></Route>
    <Route path="/admin/catalog"><RequireAdmin><AdminLayout><AdminCatalog /></AdminLayout></RequireAdmin></Route>
    <Route path="/admin/submissions"><RequireAdmin><AdminSubmissions /></RequireAdmin></Route>
    <Route path="/admin/resources"><RequireAdmin><AdminResources /></RequireAdmin></Route>
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><AuthProvider><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}><Shell><AppRouter /></Shell></WouterRouter><ApiWakeOverlay /><Toaster /></TooltipProvider></AuthProvider></QueryClientProvider>;
}

export default App;
