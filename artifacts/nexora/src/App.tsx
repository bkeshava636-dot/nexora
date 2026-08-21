import { type FormEvent, type ReactNode, memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link, Redirect, Route, Switch, Router as WouterRouter, useLocation, useParams } from "wouter";
import {
  ArrowLeft, ArrowRight, BarChart3, BadgeCheck, BookOpen, Calendar, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleAlert, Clock3, ExternalLink, Eye, EyeOff, FileText, Filter, Flag, FolderOpen, GitBranch, GraduationCap, KeyRound, Layers3,
  LayoutDashboard, LibraryBig, Link2, Loader2, Lock, LogOut, Menu, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Send, ShieldCheck,
  SlidersHorizontal, Sparkles, Trash2, Upload, Users, X,
} from "lucide-react";
import { ApiWakeOverlay } from "@/components/api-wake-overlay";
import { BuyMePaneerFooter } from "@/components/buy-me-paneer";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MutationCache, QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  getListBranchesQueryKey,
  getListCurriculumTemplatesQueryKey,
  getListReportsQueryKey,
  getListResourcesQueryKey,
  getListSemestersQueryKey,
  getListSubjectsQueryKey,
  getListSubmissionsQueryKey,
  getListYearsQueryKey,
  useApplyCurriculumTemplate,
  useApproveSubmission,
  useChangePassword,
  useCreateBranch,
  useCreateCurriculumTemplate,
  useCreateReport,
  useCreateSemester,
  useCreateSubject,
  useCreateSubmission,
  useCreateTemplateSubject,
  useCreateYear,
  useDeleteBranch,
  useDeleteCurriculumTemplate,
  useDeleteResource,
  useDeleteSemester,
  useDeleteSubject,
  useDeleteTemplateSubject,
  useDeleteYear,
  useDismissReport,
  useForgotPassword,
  useGetBranch,
  useGetCurriculumTemplate,
  useGetSemester,
  useGetSubject,
  useGetYear,
  useListBranches,
  useListCurriculumTemplates,
  useListReports,
  useListResources,
  useListSemesters,
  useListSubjects,
  useListSubmissions,
  useListYears,
  useRejectSubmission,
  useReorderBranches,
  useReorderSemesters,
  useReorderTemplateSubjects,
  useReorderYears,
  useResetPassword,
  useResolveReport,
  useUpdateBranch,
  useUpdateCurriculumTemplate,
  useUpdateResource,
  useUpdateSemester,
  useUpdateSubject,
  useUpdateTemplateSubject,
  useUpdateYear,
  type Branch,
  type CurriculumTemplateItem,
  type CurriculumTemplateSubjectItem,
  type ReportItem,
  type ReportReason,
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
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s cache freshness avoids duplicate refetches on quick route switches
      refetchOnWindowFocus: false, // Prevents sudden network spikes on tab focus
      retry: 1,
    },
  },
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
      <main className="nexora-main min-h-[calc(100dvh-68px)] flex flex-col justify-between">
        <div className="flex-1">{children}</div>
        {!location.startsWith("/admin") && <BuyMePaneerFooter />}
      </main>
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

const ResourceCard = memo(function ResourceCard({ resource, compact = false }: { resource: Resource; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const formattedDate = resource.createdAt ? formatDate(resource.createdAt) : null;
  const pathParts = [resource.branchName, resource.yearName, resource.semesterName].filter(Boolean);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`card-lift focus-ring group flex flex-col justify-between rounded-2xl border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] text-left p-4 transition-all sm:p-5 w-full cursor-pointer`}
        data-testid={`card-resource-${resource.id}`}
        aria-label={`View details for ${resource.title}`}
      >
        <div className="w-full">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <ResourceIcon type={resource.resourceType} />
              <div className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  {resource.resourceType}
                </span>
                {resource.subjectName && (
                  <p className="mt-0.5 text-xs font-bold text-[hsl(var(--foreground))] truncate" title={resource.subjectName}>
                    {resource.subjectName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {resource.isNew && (
                <span className="rounded-full bg-[hsl(var(--secondary)/.22)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">
                  New
                </span>
              )}
              {resource.isFeatured && (
                <span className="rounded-full bg-[hsl(var(--accent)/.8)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--accent-foreground))]">
                  Featured
                </span>
              )}
            </div>
          </div>

          <h3 className="mt-3 text-sm font-bold leading-snug group-hover:text-[hsl(var(--accent-foreground))] transition-colors line-clamp-2">
            {resource.title}
          </h3>

          {!compact && resource.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              {resource.description}
            </p>
          )}
        </div>

        <div className="mt-4 w-full border-t border-[hsl(var(--border))] pt-3">
          <div className="flex items-center justify-between gap-2">
            {pathParts.length > 0 ? (
              <span className="truncate text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                {pathParts.join(" · ")}
              </span>
            ) : <span />}
            <VerifiedBadge verified={resource.isVerified} />
          </div>
          {formattedDate && (
            <p className="mt-1.5 text-[10px] text-[hsl(var(--muted-foreground)/.8)]">
              Added {formattedDate}
            </p>
          )}
        </div>
      </button>

      {open && (
        <ResourceDetailsDialog
          resource={resource}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
});

function ResourceDetailsDialog({
  resource,
  open,
  onOpenChange,
}: {
  resource: Resource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reportOpen, setReportOpen] = useState(false);
  const formattedDate = resource.createdAt ? formatDate(resource.createdAt) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-lg p-5 sm:p-6 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
          data-testid={`modal-resource-details-${resource.id}`}
        >
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center justify-between gap-2 pr-6">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-[hsl(var(--muted))] px-2.5 py-1 text-xs font-bold text-[hsl(var(--foreground))]">
                  {resource.resourceType}
                </span>
                {resource.isNew && (
                  <span className="rounded-full bg-[hsl(var(--secondary)/.22)] px-2.5 py-0.5 text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">
                    New
                  </span>
                )}
                {resource.isFeatured && (
                  <span className="rounded-full bg-[hsl(var(--accent)/.8)] px-2.5 py-0.5 text-[10px] font-bold text-[hsl(var(--accent-foreground))]">
                    Featured
                  </span>
                )}
                <VerifiedBadge verified={resource.isVerified} />
              </div>
            </div>
            <DialogTitle className="display-font text-xl font-bold tracking-tight text-[hsl(var(--foreground))] sm:text-2xl pt-1">
              {resource.title}
            </DialogTitle>
            {resource.subjectName && (
              <DialogDescription className="text-xs font-semibold text-[hsl(var(--accent-foreground))]">
                {resource.subjectName}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-4 text-xs">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {resource.branchName && (
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Branch</span>
                  <span className="font-semibold text-[hsl(var(--foreground))]">{resource.branchName}</span>
                </div>
              )}
              {resource.yearName && (
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Year</span>
                  <span className="font-semibold text-[hsl(var(--foreground))]">{resource.yearName}</span>
                </div>
              )}
              {resource.semesterName && (
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Semester</span>
                  <span className="font-semibold text-[hsl(var(--foreground))]">{resource.semesterName}</span>
                </div>
              )}
              {resource.subjectName && (
                <div className="col-span-2 sm:col-span-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Subject</span>
                  <span className="font-semibold text-[hsl(var(--foreground))]">{resource.subjectName}</span>
                </div>
              )}
              {formattedDate && (
                <div className="col-span-2 sm:col-span-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Date added</span>
                  <span className="font-semibold text-[hsl(var(--foreground))]">{formattedDate}</span>
                </div>
              )}
            </div>
          </div>

          {resource.description ? (
            <div className="space-y-1 text-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Description</span>
              <p className="leading-relaxed text-[hsl(var(--muted-foreground))]">{resource.description}</p>
            </div>
          ) : null}

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="focus-ring text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors flex items-center justify-center sm:justify-start gap-1.5 py-1 px-1"
              data-testid="button-open-report"
            >
              <Flag size={13} /> Report resource
            </button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <DialogClose asChild>
                <button
                  type="button"
                  className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)] transition-colors w-full sm:w-auto"
                >
                  Close
                </button>
              </DialogClose>
              <a
                href={resource.googleDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity w-full sm:w-auto"
                data-testid="button-open-resource"
              >
                <ExternalLink size={14} /> Open Resource
              </a>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportResourceDialog
        resource={resource}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </>
  );
}

function ReportResourceDialog({
  resource,
  open,
  onOpenChange,
}: {
  resource: Resource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState("");
  const createReport = useCreateReport();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (createReport.isPending) return;
    if (!reason) {
      setError("Please select a reason for reporting.");
      return;
    }
    if (reason === "Other" && !explanation.trim()) {
      setError("Please provide a short explanation for 'Other'.");
      return;
    }

    createReport.mutate(
      {
        data: {
          resourceId: resource.id,
          reason: reason as ReportReason,
          explanation: explanation.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Report submitted",
            description: "Thanks for helping us keep Nexora accurate.",
          });
          onOpenChange(false);
          setReason("");
          setExplanation("");
          setError("");
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err) || "Unable to submit report. Please try again.");
        },
      },
    );
  };

  const reportReasonsList: ReportReason[] = [
    "Broken link",
    "Wrong subject",
    "Wrong branch/year/semester",
    "Duplicate resource",
    "Incorrect content",
    "Other",
  ];

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) { setReason(""); setExplanation(""); setError(""); } }}>
      <DialogContent
        className="sm:max-w-md p-5 sm:p-6 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
        data-testid={`modal-report-resource-${resource.id}`}
      >
        <DialogHeader className="text-left space-y-1.5">
          <div className="flex items-center gap-2 text-[hsl(var(--destructive))]">
            <Flag size={18} />
            <DialogTitle className="display-font text-xl font-bold tracking-tight text-[hsl(var(--foreground))]">
              Report resource
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[hsl(var(--muted-foreground))]">
            Help us fix issues with <span className="font-semibold text-[hsl(var(--foreground))]">"{resource.title}"</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
              Reason <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <div className="space-y-1.5">
              {reportReasonsList.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors text-xs font-semibold ${
                    reason === r
                      ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.15)] text-[hsl(var(--foreground))]"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border)/.8)] hover:bg-[hsl(var(--muted)/.3)]"
                  }`}
                  data-testid={`radio-report-reason-${r.toLowerCase().replaceAll(/[\s/]+/g, "-")}`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r}
                    checked={reason === r}
                    onChange={() => {
                      setReason(r);
                      setError("");
                    }}
                    className="accent-[hsl(var(--secondary))]"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
              {reason === "Other" ? (
                <>
                  Explanation <span className="text-[hsl(var(--destructive))]">*</span>
                </>
              ) : (
                "Additional details (optional)"
              )}
            </label>
            <textarea
              value={explanation}
              onChange={(e) => {
                setExplanation(e.target.value);
                if (error) setError("");
              }}
              rows={3}
              placeholder={
                reason === "Other"
                  ? "Describe the issue..."
                  : "Tell us more about what's wrong (optional)..."
              }
              className="input-style text-xs resize-none"
              data-testid="textarea-report-explanation"
            />
          </div>

          {error && (
            <div
              className="flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]"
              role="alert"
              data-testid="status-report-error"
            >
              <CircleAlert size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <DialogFooter className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <button
                type="button"
                disabled={createReport.isPending}
                className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)] transition-colors w-full sm:w-auto"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={createReport.isPending}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--destructive))] px-5 py-2.5 text-xs font-bold text-[hsl(var(--destructive-foreground))] hover:opacity-90 disabled:opacity-60 transition-opacity w-full sm:w-auto"
              data-testid="button-submit-report"
            >
              {createReport.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Submit report
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResourceTypeGroups({ resources, compact = false }: { resources: Resource[]; compact?: boolean }) {
  const groupsByType = useMemo(() => {
    const map = new Map<ResourceType, Resource[]>();
    for (const res of resources) {
      const list = map.get(res.resourceType);
      if (list) {
        list.push(res);
      } else {
        map.set(res.resourceType, [res]);
      }
    }
    return map;
  }, [resources]);

  return (
    <div className="space-y-8">
      {resourceTypeSections.map(({ type, label }) => {
        const group = groupsByType.get(type);
        if (!group || !group.length) return null;
        return (
          <section key={type} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.45)] p-4 sm:p-5" data-testid={`resource-type-section-${type.toLowerCase().replaceAll(" ", "-")}`}>
            <div className="mb-4 flex items-end justify-between gap-4 border-b border-[hsl(var(--border))] pb-3">
              <div>
                <p className="micro-label text-[hsl(var(--accent-foreground))]">Resource type</p>
                <h2 className="mt-1 text-lg font-bold">{label}</h2>
              </div>
              <span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                {group.length} {group.length === 1 ? "resource" : "resources"}
              </span>
            </div>
            <div className={`grid gap-4 ${compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
              {group.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} compact={compact} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Home() {
  const { data: resources = [], isLoading } = useListResources();
  const featured = useMemo(
    () => resources.filter((resource) => resource.isFeatured).slice(0, 3),
    [resources],
  );
  const recentlyAdded = useMemo(
    () =>
      [...resources]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [resources],
  );

  return (
    <div className="hero-wash">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12 lg:py-16">
        <section className="soft-grid relative overflow-hidden rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-5 py-10 sm:px-10 sm:py-14 lg:px-16">
          <div className="relative max-w-2xl fade-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--accent-foreground))]">
              Nexora
            </div>
            <h1 className="display-font max-w-xl text-4xl font-bold leading-[1.05] tracking-[-.06em] sm:text-6xl">
              Your BITM academic resource hub.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">
              Find notes, PYQs, study materials and other academic resources in one place.
            </p>
            <div className="mt-8 max-w-xl flex flex-col gap-4">
              <SearchBox />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Link href="/resources" className="focus-ring inline-flex h-11 items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-6 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-colors hover:bg-[hsl(var(--primary)/.9)]">
                  Explore Resources
                </Link>
                <Link href="/contribute" className="focus-ring inline-flex h-11 items-center justify-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 text-sm font-bold text-[hsl(var(--foreground))] shadow-sm transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]">
                  Contribute
                </Link>
              </div>
            </div>
          </div>
          <div className="absolute -right-8 -top-8 hidden h-64 w-64 rounded-full border-[18px] border-[hsl(var(--secondary)/.26)] sm:block lg:h-80 lg:w-80" />
          <div className="absolute right-20 top-20 hidden h-20 w-20 rounded-full bg-[hsl(var(--accent)/.8)] sm:block" />
        </section>

        <section className="mt-12 fade-up fade-up-delay-1">
          <SectionHeading eyebrow="Quick Access" title="Explore by category" />
          <CatalogQuickAccess />
        </section>

        <section className="mt-12 fade-up fade-up-delay-1">
          <SectionHeading
            eyebrow="Start with your path"
            title="All Branches"
            action={
              <Link
                href="/resources"
                className="focus-ring hidden items-center gap-1 text-xs font-bold text-[hsl(var(--accent-foreground))] sm:flex"
                data-testid="link-all-branches"
              >
                View all resources <ArrowRight size={14} />
              </Link>
            }
          />
          <BranchGrid />
        </section>

        {(isLoading || featured.length > 0) && (
          <section className="mt-12 fade-up fade-up-delay-2">
            <SectionHeading eyebrow="Handpicked" title="Featured resources" />
            {isLoading ? (
              <LoadingGrid />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            )}
          </section>
        )}

        {(isLoading || recentlyAdded.length > 0) && (
          <section className="mt-12 fade-up fade-up-delay-2" data-testid="section-recently-added">
            <SectionHeading
              eyebrow="Latest resources added to Nexora"
              title="Recently Added"
              action={
                <Link
                  href="/resources"
                  className="focus-ring inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--accent-foreground))] hover:underline"
                  data-testid="link-view-all-recently-added"
                >
                  View all resources <ArrowRight size={14} />
                </Link>
              }
            />
            {isLoading ? (
              <LoadingGrid count={6} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentlyAdded.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mt-16 mb-8 rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-12 text-center shadow-sm sm:px-12 sm:py-16 fade-up fade-up-delay-3">
          <div className="mx-auto max-w-2xl">
            <h2 className="display-font text-3xl font-bold tracking-[-.04em] sm:text-4xl">Contribute to Nexora</h2>
            <p className="mt-4 text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">
              Have useful study material? Share it with your batch and help build the Nexora library.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/contribute" className="focus-ring inline-flex h-12 items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-8 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-colors hover:bg-[hsl(var(--primary)/.9)]">
                Contribute a Resource
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function getUniqueYearsCount(yearsList: Array<{ name?: string }>): number {
  return new Set(yearsList.map((y) => y.name?.trim()).filter(Boolean)).size;
}

function getUniqueSemestersCount(semestersList: Array<{ name?: string }>): number {
  return new Set(semestersList.map((s) => s.name?.trim()).filter(Boolean)).size;
}

function CatalogQuickAccess() {
  const { data: branches = [] } = useListBranches();
  const { data: years = [] } = useListYears();
  const { data: semesters = [] } = useListSemesters();
  const { data: resources = [], isLoading } = useListResources();

  const uniqueYearsCount = useMemo(() => getUniqueYearsCount(years), [years]);
  const uniqueSemestersCount = useMemo(() => getUniqueSemestersCount(semesters), [semesters]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0,1,2,3].map(i => <div key={i} className="h-36 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)]" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Link href="/resources" className="card-lift focus-ring group flex flex-col items-center justify-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 text-center shadow-sm" data-testid="link-quick-resources">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))] transition-transform group-hover:scale-110">
          <BookOpen size={24} />
        </div>
        <div>
          <div className="font-bold text-[hsl(var(--foreground))]">Resources</div>
          <div className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{resources.length} available</div>
        </div>
      </Link>
      <Link href="/resources" className="card-lift focus-ring group flex flex-col items-center justify-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 text-center shadow-sm" data-testid="link-quick-branches">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--secondary)/.1)] text-[hsl(var(--secondary))] transition-transform group-hover:scale-110">
          <GitBranch size={24} />
        </div>
        <div>
          <div className="font-bold text-[hsl(var(--foreground))]">Branches</div>
          <div className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{branches.length} available</div>
        </div>
      </Link>
      <Link href="/resources" className="card-lift focus-ring group flex flex-col items-center justify-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 text-center shadow-sm" data-testid="link-quick-years">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--accent)/.1)] text-[hsl(var(--accent-foreground))] transition-transform group-hover:scale-110">
          <Calendar size={24} />
        </div>
        <div>
          <div className="font-bold text-[hsl(var(--foreground))]">Years</div>
          <div className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{uniqueYearsCount} available</div>
        </div>
      </Link>
      <Link href="/resources" className="card-lift focus-ring group flex flex-col items-center justify-center gap-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 text-center shadow-sm" data-testid="link-quick-semesters">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-transform group-hover:scale-110">
          <Layers3 size={24} />
        </div>
        <div>
          <div className="font-bold text-[hsl(var(--foreground))]">Semesters</div>
          <div className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{uniqueSemestersCount} available</div>
        </div>
      </Link>
    </div>
  );
}

function BranchGrid() {
  const { data: branches = [], isLoading } = useListBranches();
  if (isLoading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)]" />)}</div>;
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{branches.map((branch) => <BranchCard key={branch.id} branch={branch} />)}</div>;
}

const BranchCard = memo(function BranchCard({ branch }: { branch: Branch }) {
  return <Link href={`/branch/${branch.id}`} className="card-lift focus-ring group block rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5" data-testid={`link-branch-${branch.id}`}>
    <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><GraduationCap size={20} /></span><ChevronRight size={18} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" /></div>
    <h3 className="mt-4 text-base font-bold">{branch.shortName}</h3>
    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{branch.description}</p>
    <div className="mt-4 flex gap-3 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]"><span>{branch.subjectCount} subjects</span><span>{branch.resourceCount} resources</span></div>
  </Link>;
});

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
    <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={18} />
    <input value={current} onChange={(e) => { controlled ? onChange?.(e.target.value) : setLocal(e.target.value); }} className="input-style h-14 !pl-12 pr-11 text-sm shadow-sm" placeholder="Search notes, papers, subjects..." data-testid="input-search" />
    {current ? (
      <button
        type="button"
        onClick={() => { controlled ? onChange?.("") : setLocal(""); }}
        className="focus-ring absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        aria-label="Clear search"
        data-testid="button-clear-search"
      >
        <X size={16} />
      </button>
    ) : null}
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

  const availableBranches = useMemo(() => {
    const list: { label: string; value: string }[] = [{ label: "All branches", value: "All branches" }];
    if (branches.length > 0) {
      branches.forEach((b) => {
        const label = b.shortName ? `${b.shortName} · ${b.name}` : b.name;
        list.push({ label, value: b.name });
      });
    } else {
      const distinctNames = Array.from(new Set(resources.map((r) => r.branchName).filter((v): v is string => Boolean(v))));
      distinctNames.forEach((name) => {
        list.push({ label: name, value: name });
      });
    }
    return list;
  }, [branches, resources]);

  const availableYears = useMemo(() => {
    const subset = branch === "All branches" ? resources : resources.filter((r) => r.branchName === branch);
    return ["All years", ...new Set(subset.map((r) => r.yearName).filter((v): v is string => Boolean(v)))];
  }, [resources, branch]);

  const availableSemesters = useMemo(() => {
    const subset = resources.filter((r) =>
      (branch === "All branches" || r.branchName === branch) &&
      (year === "All years" || r.yearName === year)
    );
    return ["All semesters", ...new Set(subset.map((r) => r.semesterName).filter((v): v is string => Boolean(v)))];
  }, [resources, branch, year]);

  const availableSubjects = useMemo(() => {
    const subset = resources.filter((r) =>
      (branch === "All branches" || r.branchName === branch) &&
      (year === "All years" || r.yearName === year) &&
      (semester === "All semesters" || r.semesterName === semester)
    );
    return ["All subjects", ...new Set(subset.map((r) => r.subjectName).filter((v): v is string => Boolean(v)))];
  }, [resources, branch, year, semester]);

  const handleBranchChange = (newBranch: string) => {
    setBranch(newBranch);
    setYear("All years");
    setSemester("All semesters");
    setSubject("All subjects");
  };

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    setSemester("All semesters");
    setSubject("All subjects");
  };

  const handleSemesterChange = (newSemester: string) => {
    setSemester(newSemester);
    setSubject("All subjects");
  };

  const hasActiveFilters = Boolean(
    query.trim() ||
    branch !== "All branches" ||
    year !== "All years" ||
    semester !== "All semesters" ||
    subject !== "All subjects" ||
    type !== "All types" ||
    verified
  );

  const clearFilters = () => {
    setQuery("");
    setBranch("All branches");
    setYear("All years");
    setSemester("All semesters");
    setSubject("All subjects");
    setType("All types");
    setVerified(false);
  };

  const filtered = useMemo(() => {
    const rawQuery = query.trim().toLowerCase();
    const queryWords = rawQuery ? rawQuery.split(/\s+/).filter(Boolean) : [];
    return resources.filter((resource) => {
      if (branch !== "All branches" && resource.branchName !== branch) return false;
      if (year !== "All years" && resource.yearName !== year) return false;
      if (semester !== "All semesters" && resource.semesterName !== semester) return false;
      if (subject !== "All subjects" && resource.subjectName !== subject) return false;
      if (type !== "All types" && resource.resourceType !== type) return false;
      if (verified && !resource.isVerified) return false;
      if (queryWords.length > 0) {
        const haystack = `${resource.title} ${resource.subjectName ?? ""} ${resource.description ?? ""} ${resource.branchName ?? ""} ${resource.yearName ?? ""} ${resource.semesterName ?? ""} ${resource.resourceType}`.toLowerCase();
        if (!queryWords.every((word) => haystack.includes(word))) return false;
      }
      return true;
    });
  }, [resources, query, branch, year, semester, subject, type, verified]);

  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12">
    <div className="mb-8">
      <p className="micro-label mb-2 text-[hsl(var(--accent-foreground))]">The shelf</p>
      <h1 className="display-font text-4xl font-bold tracking-[-.05em] sm:text-5xl">Resource library</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Everything is sorted by academic path, so you can spend less time hunting and more time understanding.</p>
    </div>
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.72)] p-3 sm:p-4">
      <SearchBox value={query} onChange={setQuery} />
      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 mobile-scroll">
        <SelectPill label={branch} options={availableBranches} onChange={handleBranchChange} testId="select-branch-filter" />
        <SelectPill label={year} options={availableYears} onChange={handleYearChange} testId="select-year-filter" />
        <SelectPill label={semester} options={availableSemesters} onChange={handleSemesterChange} testId="select-semester-filter" />
        <SelectPill label={subject} options={availableSubjects} onChange={setSubject} testId="select-subject-filter" />
        <SelectPill label={type} options={["All types", ...resourceTypes]} onChange={setType} testId="select-type-filter" />
        <button
          type="button"
          onClick={() => setVerified(!verified)}
          className={`focus-ring flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${verified ? "border-[hsl(var(--accent-foreground))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]" : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]"}`}
          data-testid="button-filter-verified"
        >
          <BadgeCheck size={14} /> Verified only
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="focus-ring flex shrink-0 items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)] transition-colors"
            data-testid="button-clear-filters-pill"
          >
            <X size={13} /> Clear filters
          </button>
        )}
      </div>
    </div>
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-semibold">{filtered.length} <span className="font-normal text-[hsl(var(--muted-foreground))]">resources found</span></p>
      <div className="flex items-center gap-3">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="focus-ring inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--accent-foreground))] hover:underline"
            data-testid="button-clear-filters"
          >
            <X size={13} /> Clear filters
          </button>
        )}
        <span className="hidden items-center gap-1 text-xs text-[hsl(var(--muted-foreground))] sm:flex"><SlidersHorizontal size={14} /> Showing your filters</span>
      </div>
    </div>
    {isLoading ? (
      <LoadingGrid count={6} />
    ) : filtered.length ? (
      <div className="mt-4"><ResourceTypeGroups resources={filtered} /></div>
    ) : (
      <EmptyState
        title="No resources found"
        body="Try changing your search or filters."
        action={
          hasActiveFilters ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"
                data-testid="button-empty-clear-filters"
              >
                <X size={14} /> Clear filters
              </button>
              <Link
                href="/contribute"
                className="focus-ring inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-xs font-bold"
                data-testid="link-empty-contribute"
              >
                <Upload size={14} /> Share a resource
              </Link>
            </div>
          ) : (
            <Link
              href="/contribute"
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"
              data-testid="link-empty-contribute"
            >
              Share a resource <ArrowRight size={14} />
            </Link>
          )
        }
      />
    )}
  </div>;
}

type SelectOption = string | { label: string; value: string };

function SelectPill({
  label,
  options,
  onChange,
  testId,
}: {
  label: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  testId: string;
}) {
  const normalizedOptions = useMemo(
    () =>
      options.map((opt) =>
        typeof opt === "string" ? { label: opt, value: opt } : opt,
      ),
    [options],
  );

  const isFiltered = Boolean(label && !label.startsWith("All "));
  const selectedOption = normalizedOptions.find(
    (opt) => opt.value === label || opt.label === label,
  );
  const currentValue = selectedOption?.value ?? (normalizedOptions[0]?.value ?? "");

  return (
    <div className="relative inline-flex shrink-0 items-center">
      <select
        value={currentValue}
        onChange={(event) => onChange(event.target.value)}
        aria-label={selectedOption?.label ?? label}
        className={`focus-ring appearance-none rounded-xl border py-2 pl-3 pr-8 text-xs font-bold transition-colors cursor-pointer ${
          isFiltered
            ? "border-[hsl(var(--accent-foreground))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
            : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
        }`}
        data-testid={testId}
      >
        {normalizedOptions.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
          >
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        className={`pointer-events-none absolute right-2.5 ${
          isFiltered
            ? "text-[hsl(var(--accent-foreground))]"
            : "text-[hsl(var(--muted-foreground))]"
        }`}
      />
    </div>
  );
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
    if (createSubmission.isPending) return;
    if (!form.title.trim() || !form.studentName.trim() || !form.studentEmail.trim()) {
      setError("Please fill in the required fields before sending.");
      return;
    }
    if (!form.googleDriveUrl.trim() || !isValidGoogleDriveUrl(form.googleDriveUrl)) {
      setError("Please enter a valid Google Drive link.");
      return;
    }
    if (!subjectId) {
      setError("Please choose a branch, year, semester, and subject before sending.");
      return;
    }
    createSubmission.mutate({ data: { ...form, branchId, yearId, semesterId, subjectId } }, {
      onSuccess: () => {
        setSubmitted(true);
        setError("");
        toast({
          title: "Resource submitted successfully!",
          description: "Your submission will appear after admin review.",
        });
      },
      onError: (err) => {
        setError(getErrorMessage(err) || "Unable to submit the resource. Please try again.");
      },
    });
  };

  if (submitted) return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-7 sm:py-20"><div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-14 text-center sm:px-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><CheckCircle2 size={32} /></div><p className="micro-label mt-6 text-[hsl(var(--accent-foreground))]">In the review queue</p><h1 className="display-font mt-2 text-3xl font-bold tracking-[-.05em] sm:text-4xl">Resource submitted successfully!</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">Your submission will appear after admin review. Our student editors will check the link and details before it joins Nexora. That keeps the Verified badge meaningful for everyone.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/resources" className="focus-ring rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-confirmation-library">Browse the library</Link><button type="button" onClick={() => { setSubmitted(false); setForm({ ...form, title: "", description: "", googleDriveUrl: "" }); setError(""); }} className="focus-ring rounded-xl border border-[hsl(var(--border))] px-5 py-3 text-sm font-bold" data-testid="button-submit-another">Share another</button></div></div></div>;

  return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-7 sm:py-12"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contribute" }]} /><div className="mb-8 max-w-2xl"><p className="micro-label mb-2 text-[hsl(var(--accent-foreground))]">Give back a little</p><h1 className="display-font text-4xl font-bold tracking-[-.05em] sm:text-5xl">Put a useful file<br />in the right hands.</h1><p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Share material you trust. We review every submission before it becomes part of the library.</p></div>
    <section className="mb-8 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-5 sm:p-7" aria-labelledby="how-to-contribute-title" data-testid="section-how-to-contribute">
      <div className="flex items-center gap-2 mb-3.5">
        <Sparkles size={16} className="text-[hsl(var(--accent-foreground))]" />
        <h2 id="how-to-contribute-title" className="text-sm font-bold tracking-tight text-[hsl(var(--foreground))]">How to contribute</h2>
      </div>
      <ol className="space-y-2.5 text-xs leading-5 text-[hsl(var(--muted-foreground))] list-none p-0 m-0">
        <li className="flex items-start gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[11px] font-bold text-[hsl(var(--foreground))]">1</span>
          <span>Upload your notes/PYQs/study material to Google Drive.</span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[11px] font-bold text-[hsl(var(--foreground))]">2</span>
          <span>Make sure the file can be accessed through the shared link.</span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[11px] font-bold text-[hsl(var(--foreground))]">3</span>
          <span>Copy the Google Drive link.</span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))] text-[11px] font-bold text-[hsl(var(--foreground))]">4</span>
          <span>Paste the link into Nexora and submit.</span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary)/.3)] text-[11px] font-bold text-[hsl(var(--secondary-foreground))]">5</span>
          <span>The admin will review it before it appears on Nexora.</span>
        </li>
      </ol>
    </section>
    <form onSubmit={submit} className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.78)] p-5 sm:p-8"><FormSection title="Where does it belong?"><div className="grid gap-4 sm:grid-cols-2"><Field label="Branch" required><select value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value))} className="input-style" data-testid="select-contribution-branch">{branches.map((item) => <option key={item.id} value={item.id}>{item.shortName} — {item.name}</option>)}</select></Field><Field label="Subject" required><select value={subjectId ?? ""} onChange={(e) => setSubjectId(Number(e.target.value))} className="input-style" data-testid="select-contribution-subject">{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Year" required><select value={yearId ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="input-style" data-testid="select-contribution-year">{years.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Semester" required><select value={semesterId ?? ""} onChange={(e) => setSemesterId(Number(e.target.value))} className="input-style" data-testid="select-contribution-semester">{semesters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div></FormSection><FormSection title="Tell us about it"><div className="grid gap-4"><Field label="Resource type" required><select value={form.resourceType} onChange={(e) => update("resourceType", e.target.value)} className="input-style" data-testid="select-contribution-type">{resourceTypes.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Title" required><input value={form.title} onChange={(e) => update("title", e.target.value)} className="input-style" placeholder="e.g. Data Structures revision notes" data-testid="input-contribution-title" /></Field><Field label="Short description"><textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="input-style min-h-24 resize-y" placeholder="What will a student find inside?" data-testid="textarea-contribution-description" /></Field><Field label="Google Drive link" required hint={`${googleDriveUrlHint} Also make sure link access is set to "Anyone with the link".`}><div className="relative"><Link2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={16} /><input value={form.googleDriveUrl} onChange={(e) => update("googleDriveUrl", e.target.value)} className="input-style pl-11" placeholder="https://drive.google.com/..." data-testid="input-contribution-url" /></div></Field></div></FormSection><FormSection title="A little about you"><div className="grid gap-4 sm:grid-cols-2"><Field label="Your name" required><input value={form.studentName} onChange={(e) => update("studentName", e.target.value)} className="input-style" placeholder="How should we credit you?" data-testid="input-contribution-name" /></Field><Field label="College email" required><input type="email" value={form.studentEmail} onChange={(e) => update("studentEmail", e.target.value)} className="input-style" placeholder="you@college.edu" data-testid="input-contribution-email" /></Field></div></FormSection>{error && <div className="mb-4 flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]" role="alert" data-testid="status-contribution-error"><CircleAlert size={15} className="mt-0.5 shrink-0" />{error}</div>}<div className="flex flex-col items-start justify-between gap-4 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:items-center"><p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">Submissions are checked by the Nexora student team.</p><button type="submit" disabled={createSubmission.isPending} className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-60 w-full sm:w-auto" data-testid="button-submit-contribution">{createSubmission.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send for review</button></div></form></div>;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) { return <fieldset className="border-b border-[hsl(var(--border))] py-6 first:pt-0 last:border-0"><legend className="mb-4 text-sm font-bold">{title}</legend>{children}</fieldset>; }
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-bold">{label}{required && <span className="ml-1 text-[hsl(var(--destructive))]">*</span>}</span>{children}{hint && <span className="mt-1.5 block text-[11px] leading-4 text-[hsl(var(--muted-foreground))]">{hint}</span>}</label>; }

function LoginPage() {
  const { login, isLoggingIn, loginError, isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [, navigate] = useLocation();

  if (isAuthenticated) return <Redirect to="/admin" />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setLocalError("Please enter both username and password.");
      return;
    }
    setLocalError(null);
    try {
      await login({ username: username.trim(), password });
      navigate("/admin");
    } catch (err: unknown) {
      setLocalError(getErrorMessage(err) || "Incorrect username or password.");
    }
  };

  const displayedError = localError || loginError;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-68px)] max-w-md flex-col justify-center px-4 py-12 sm:px-7">
      <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-9">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))]">
          <Lock size={22} />
        </div>
        <h1 className="display-font mt-5 text-center text-2xl font-bold tracking-[-.04em]">Admin sign in</h1>
        <p className="mt-2 text-center text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          Sign in to review submissions and manage the resource library.
        </p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <Field label="Username" required>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (localError) setLocalError(null);
              }}
              className="input-style"
              autoComplete="username"
              required
              data-testid="input-login-username"
            />
          </Field>
          <div>
            <div className="flex items-center justify-between">
              <label className="mb-1.5 block text-xs font-bold">
                Password <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <Link
                href="/forgot-password"
                className="focus-ring text-xs font-bold text-[hsl(var(--accent-foreground))] hover:underline"
                data-testid="link-forgot-password"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (localError) setLocalError(null);
                }}
                className="input-style pr-10"
                autoComplete="current-password"
                required
                data-testid="input-login-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {displayedError && (
            <div
              className="flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]"
              role="alert"
              data-testid="status-login-error"
            >
              <CircleAlert size={15} className="mt-0.5 shrink-0" />
              {displayedError}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-60"
            data-testid="button-login-submit"
          >
            {isLoggingIn ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />} Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const forgotPassword = useForgotPassword({
    onSuccess: () => {
      setSubmitted(true);
      setError("");
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err) || "Failed to request password reset.");
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    forgotPassword.mutate({ data: { email: email.trim() } });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-68px)] max-w-md flex-col justify-center px-4 py-12 sm:px-7">
      <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-9">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))]">
          <KeyRound size={22} />
        </div>
        <h1 className="display-font mt-5 text-center text-2xl font-bold tracking-[-.04em]">
          Forgot password?
        </h1>
        <p className="mt-2 text-center text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          Enter your admin email to receive a password reset link.
        </p>

        {submitted ? (
          <div className="mt-6 space-y-5" data-testid="status-forgot-password-success">
            <div className="rounded-2xl border border-[hsl(var(--accent-foreground)/.2)] bg-[hsl(var(--accent))] p-4 text-xs font-semibold text-[hsl(var(--accent-foreground))]">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                <p className="leading-5">
                  If an account exists for this email, you'll receive a password reset link.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
              data-testid="link-back-login-success"
            >
              <ArrowLeft size={15} /> Return to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Field label="Admin email" required>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-style"
                placeholder="admin@college.edu"
                autoComplete="email"
                required
                data-testid="input-forgot-email"
              />
            </Field>

            {error && (
              <div
                className="flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]"
                role="alert"
                data-testid="status-forgot-error"
              >
                <CircleAlert size={15} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={forgotPassword.isPending}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-60"
              data-testid="button-forgot-submit"
            >
              {forgotPassword.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              Request reset link
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="focus-ring inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                data-testid="link-back-login"
              >
                <ArrowLeft size={13} /> Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ResetPasswordPage() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") ?? "", []);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const resetPassword = useResetPassword({
    onSuccess: () => {
      setSubmitted(true);
      setError("");
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err) || "Failed to reset password.");
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Password reset token is missing or invalid.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    resetPassword.mutate({
      data: { token, newPassword },
    });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-68px)] max-w-md flex-col justify-center px-4 py-12 sm:px-7">
      <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 sm:p-9">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))]">
          <KeyRound size={22} />
        </div>
        <h1 className="display-font mt-5 text-center text-2xl font-bold tracking-[-.04em]">
          Reset password
        </h1>
        <p className="mt-2 text-center text-xs leading-5 text-[hsl(var(--muted-foreground))]">
          Choose a new password for your admin account.
        </p>

        {submitted ? (
          <div className="mt-6 space-y-5" data-testid="status-reset-password-success">
            <div className="rounded-2xl border border-[hsl(var(--accent-foreground)/.2)] bg-[hsl(var(--accent))] p-4 text-xs font-semibold text-[hsl(var(--accent-foreground))]">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                <p className="leading-5">
                  Password reset successfully. You can now log in.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
              data-testid="link-login-after-reset"
            >
              Go to sign in <ArrowRight size={15} />
            </Link>
          </div>
        ) : !token ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.1)] p-4 text-xs font-semibold text-[hsl(var(--destructive))]">
              <div className="flex items-start gap-2.5">
                <CircleAlert size={17} className="mt-0.5 shrink-0" />
                <p className="leading-5">
                  Invalid or missing password reset link. Please request a new one.
                </p>
              </div>
            </div>
            <Link
              href="/forgot-password"
              className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
              data-testid="link-request-new-reset"
            >
              Request new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold">
                New password <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-style pr-10"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  data-testid="input-reset-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold">
                Confirm new password <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-style"
                placeholder="Re-enter new password"
                required
                minLength={8}
                data-testid="input-reset-confirm-password"
              />
            </div>

            {error && (
              <div
                className="flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]"
                role="alert"
                data-testid="status-reset-error"
              >
                <CircleAlert size={15} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={resetPassword.isPending}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-60"
              data-testid="button-reset-submit"
            >
              {resetPassword.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Check size={15} />
              )}
              Update password
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="focus-ring inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                data-testid="link-back-login-from-reset"
              >
                <ArrowLeft size={13} /> Return to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function AdminChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const changePassword = useChangePassword({
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your admin password has been changed successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err) || "Failed to update password.");
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setError("");
    changePassword.mutate({
      data: { currentPassword, newPassword },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Admin Password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a secure new password (min. 8 characters).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">
              Current password *
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-style pr-10 text-xs"
                placeholder="Enter current password"
                required
                data-testid="input-current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="focus-ring absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">
              New password *
            </label>
            <input
              type={showPass ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-style text-xs"
              placeholder="At least 8 characters"
              required
              minLength={8}
              data-testid="input-new-password"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">
              Confirm new password *
            </label>
            <input
              type={showPass ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-style text-xs"
              placeholder="Confirm new password"
              required
              minLength={8}
              data-testid="input-confirm-new-password"
            />
          </div>

          {error && (
            <div
              className="flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]"
              role="alert"
              data-testid="status-change-password-error"
            >
              <CircleAlert size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={changePassword.isPending}
              className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold text-[hsl(var(--foreground))]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={changePassword.isPending}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60"
              data-testid="button-submit-change-password"
            >
              {changePassword.isPending && <Loader2 size={13} className="animate-spin" />}
              Save password
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="mx-auto max-w-6xl px-4 py-24"><Loader2 className="mx-auto animate-spin text-[hsl(var(--muted-foreground))]" size={28} /></div>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <>{children}</>;
}

function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { username, logout } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const tabs = [
    { href: "/admin", label: "Overview", testId: "link-admin-overview" },
    { href: "/admin/catalog", label: "Catalog", testId: "link-admin-catalog" },
    { href: "/admin/templates", label: "Curriculum Templates", testId: "link-admin-templates" },
    { href: "/admin/submissions", label: "Submissions", testId: "link-admin-submissions" },
    { href: "/admin/resources", label: "Resources", testId: "link-admin-resources" },
    { href: "/admin/reports", label: "Reports", testId: "link-admin-reports" },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12">
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[hsl(var(--muted-foreground))]">
            <ShieldCheck size={15} /> Editorial workspace
            {username && <span className="font-normal text-[hsl(var(--muted-foreground)/.8)]">· signed in as {username}</span>}
          </div>
          <h1 className="display-font text-4xl font-bold tracking-[-.05em]">Keep the shelf trustworthy.</h1>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Review, organize, and keep the signal high.</p>
        </div>
        <div className="flex flex-wrap shrink-0 gap-2">
          <Link
            href="/contribute"
            className="focus-ring inline-flex w-fit items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-xs font-bold"
            data-testid="link-admin-contribute"
          >
            <Plus size={15} /> Add resource
          </Link>
          <button
            type="button"
            onClick={() => setChangePasswordOpen(true)}
            className="focus-ring inline-flex w-fit items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.6)]"
            data-testid="button-open-change-password"
          >
            <KeyRound size={15} /> Change password
          </button>
          <button
            type="button"
            onClick={logout}
            className="focus-ring inline-flex w-fit items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
            data-testid="button-logout"
          >
            <LogOut size={15} /> Log out
          </button>
        </div>
      </div>
      <div className="mb-8 flex gap-1 overflow-x-auto border-b border-[hsl(var(--border))] mobile-scroll">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`focus-ring shrink-0 border-b-2 px-3 py-3 text-xs font-bold ${
              location === tab.href
                ? "border-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
                : "border-transparent text-[hsl(var(--muted-foreground))]"
            }`}
            data-testid={tab.testId}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
      <AdminChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
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
  const branchesQuery = useListBranches({ includeInactive: true });
  const yearsQuery = useListYears();
  const semestersQuery = useListSemesters();
  const subjectsQuery = useListSubjects();
  const resourcesQuery = useListResources();
  const submissionsQuery = useListSubmissions();
  const reportsQuery = useListReports();

  const isLoading =
    branchesQuery.isLoading ||
    yearsQuery.isLoading ||
    semestersQuery.isLoading ||
    subjectsQuery.isLoading ||
    resourcesQuery.isLoading ||
    submissionsQuery.isLoading ||
    reportsQuery.isLoading;

  const isError =
    branchesQuery.isError ||
    yearsQuery.isError ||
    semestersQuery.isError ||
    subjectsQuery.isError ||
    resourcesQuery.isError ||
    submissionsQuery.isError ||
    reportsQuery.isError;

  const handleRetry = () => {
    branchesQuery.refetch();
    yearsQuery.refetch();
    semestersQuery.refetch();
    subjectsQuery.refetch();
    resourcesQuery.refetch();
    submissionsQuery.refetch();
    reportsQuery.refetch();
  };

  const branches = branchesQuery.data ?? [];
  const years = yearsQuery.data ?? [];
  const semesters = semestersQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];
  const resources = resourcesQuery.data ?? [];
  const submissions = submissionsQuery.data ?? [];
  const reports = (reportsQuery.data ?? []) as ReportItem[];

  const uniqueYearsCount = useMemo(() => getUniqueYearsCount(years), [years]);
  const uniqueSemestersCount = useMemo(() => getUniqueSemestersCount(semesters), [semesters]);

  const pendingSubmissions = useMemo(
    () => submissions.filter((s) => s.status === "pending"),
    [submissions],
  );
  const pendingReports = useMemo(
    () => reports.filter((r) => r.status === "pending"),
    [reports],
  );
  const recentResources = useMemo(
    () =>
      [...resources]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4),
    [resources],
  );

  const totalNeedsAttention = pendingSubmissions.length + pendingReports.length;

  return (
    <AdminLayout>
      {isError && (
        <div
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-4 text-xs sm:flex-row sm:items-center sm:justify-between"
          role="alert"
          data-testid="status-dashboard-error"
        >
          <div className="flex items-center gap-2 text-[hsl(var(--destructive))]">
            <CircleAlert size={16} className="shrink-0" />
            <span className="font-semibold">Unable to load all dashboard statistics.</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-lg border border-[hsl(var(--destructive)/.4)] bg-[hsl(var(--card))] px-3 py-1.5 font-bold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)]"
            data-testid="button-retry-dashboard"
          >
            <RotateCcw size={13} /> Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)]"
              />
            ))}
          </div>
          <div className="h-24 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)]" />
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)]" />
            <div className="h-64 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)]" />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Statistics Cards */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Overview statistics
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
              <Metric
                icon={GraduationCap}
                label="Branches"
                value={branches.length}
                detail={branchesQuery.isError ? "Error loading" : `${branches.filter((b) => b.isActive).length} active`}
                isError={branchesQuery.isError}
                testId="metric-branches"
              />
              <Metric
                icon={Layers3}
                label="Years"
                value={uniqueYearsCount}
                detail={yearsQuery.isError ? "Error loading" : `${years.length} branch cohorts`}
                isError={yearsQuery.isError}
                testId="metric-years"
              />
              <Metric
                icon={FolderOpen}
                label="Semesters"
                value={uniqueSemestersCount}
                detail={semestersQuery.isError ? "Error loading" : `${semesters.length} across branches`}
                isError={semestersQuery.isError}
                testId="metric-semesters"
              />
              <Metric
                icon={BookOpen}
                label="Subjects"
                value={subjects.length}
                detail={subjectsQuery.isError ? "Error loading" : "In catalog"}
                isError={subjectsQuery.isError}
                testId="metric-subjects"
              />
              <Metric
                icon={LibraryBig}
                label="Resources"
                value={resources.length}
                detail={resourcesQuery.isError ? "Error loading" : `${resources.filter((r) => r.isVerified).length} verified`}
                isError={resourcesQuery.isError}
                testId="metric-resources"
              />
              <Metric
                icon={Clock3}
                label="Pending Submissions"
                value={pendingSubmissions.length}
                detail={submissionsQuery.isError ? "Error loading" : pendingSubmissions.length ? "Needs review" : "All clear"}
                warm={pendingSubmissions.length > 0}
                isError={submissionsQuery.isError}
                testId="metric-pending-submissions"
              />
              <Metric
                icon={Flag}
                label="Reports"
                value={pendingReports.length}
                detail={reportsQuery.isError ? "Error loading" : pendingReports.length ? "Needs attention" : "All clear"}
                warm={pendingReports.length > 0}
                isError={reportsQuery.isError}
                testId="metric-pending-reports"
              />
            </div>
          </div>

          {/* Section 2: Quick Actions */}
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Quick actions
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Link
                href="/admin/catalog"
                className="focus-ring card-lift group flex flex-col justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-[hsl(var(--secondary))]"
                data-testid="quick-action-manage-branches"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))] group-hover:bg-[hsl(var(--secondary)/.2)]">
                    <GraduationCap size={18} />
                  </div>
                  <ArrowRight size={14} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold text-[hsl(var(--foreground))]">Manage Branches</p>
                  <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">{branches.length} configured</p>
                </div>
              </Link>

              <Link
                href="/admin/catalog"
                className="focus-ring card-lift group flex flex-col justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-[hsl(var(--secondary))]"
                data-testid="quick-action-manage-subjects"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))] group-hover:bg-[hsl(var(--secondary)/.2)]">
                    <BookOpen size={18} />
                  </div>
                  <ArrowRight size={14} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold text-[hsl(var(--foreground))]">Manage Subjects</p>
                  <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">{subjects.length} in catalog</p>
                </div>
              </Link>

              <Link
                href="/admin/templates"
                className="focus-ring card-lift group flex flex-col justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-[hsl(var(--secondary))]"
                data-testid="quick-action-curriculum-templates"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))] group-hover:bg-[hsl(var(--secondary)/.2)]">
                    <FolderOpen size={18} />
                  </div>
                  <ArrowRight size={14} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold text-[hsl(var(--foreground))]">Curriculum Templates</p>
                  <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">Subject blueprints</p>
                </div>
              </Link>

              <Link
                href="/admin/resources"
                className="focus-ring card-lift group flex flex-col justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-[hsl(var(--secondary))]"
                data-testid="quick-action-manage-resources"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))] group-hover:bg-[hsl(var(--secondary)/.2)]">
                    <LibraryBig size={18} />
                  </div>
                  <ArrowRight size={14} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold text-[hsl(var(--foreground))]">Manage Resources</p>
                  <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">{resources.length} on shelf</p>
                </div>
              </Link>

              <Link
                href="/admin/submissions"
                className="focus-ring card-lift group flex flex-col justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-[hsl(var(--secondary))]"
                data-testid="quick-action-review-submissions"
              >
                <div className="flex items-center justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${pendingSubmissions.length ? "bg-[hsl(var(--secondary)/.25)] text-[hsl(var(--secondary-foreground))]" : "bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"}`}>
                    <Clock3 size={18} />
                  </div>
                  {pendingSubmissions.length > 0 ? (
                    <span className="rounded-full bg-[hsl(var(--secondary)/.25)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">
                      {pendingSubmissions.length} new
                    </span>
                  ) : (
                    <ArrowRight size={14} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold text-[hsl(var(--foreground))]">Review Submissions</p>
                  <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">{pendingSubmissions.length ? `${pendingSubmissions.length} waiting` : "All clear"}</p>
                </div>
              </Link>

              <Link
                href="/admin/reports"
                className="focus-ring card-lift group flex flex-col justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-[hsl(var(--secondary))]"
                data-testid="quick-action-review-reports"
              >
                <div className="flex items-center justify-between">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${pendingReports.length ? "bg-[hsl(var(--destructive)/.15)] text-[hsl(var(--destructive))]" : "bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"}`}>
                    <Flag size={18} />
                  </div>
                  {pendingReports.length > 0 ? (
                    <span className="rounded-full bg-[hsl(var(--destructive)/.15)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--destructive))]">
                      {pendingReports.length} new
                    </span>
                  ) : (
                    <ArrowRight size={14} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" />
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold text-[hsl(var(--foreground))]">Review Reports</p>
                  <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">{pendingReports.length ? `${pendingReports.length} issue(s)` : "All clear"}</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Section 3: Needs Attention */}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6" data-testid="section-needs-attention">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
              <div>
                <p className="micro-label text-[hsl(var(--accent-foreground))]">Review & triage</p>
                <h2 className="mt-1 text-lg font-bold">Needs Attention</h2>
              </div>
              <div className="flex gap-2">
                {pendingSubmissions.length > 0 && (
                  <Link
                    href="/admin/submissions"
                    className="focus-ring inline-flex items-center gap-1 rounded-lg bg-[hsl(var(--secondary)/.2)] px-3 py-1.5 text-xs font-bold text-[hsl(var(--secondary-foreground))]"
                    data-testid="link-attention-submissions"
                  >
                    Submissions ({pendingSubmissions.length}) <ArrowRight size={13} />
                  </Link>
                )}
                {pendingReports.length > 0 && (
                  <Link
                    href="/admin/reports"
                    className="focus-ring inline-flex items-center gap-1 rounded-lg bg-[hsl(var(--destructive)/.1)] px-3 py-1.5 text-xs font-bold text-[hsl(var(--destructive))]"
                    data-testid="link-attention-reports"
                  >
                    Reports ({pendingReports.length}) <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            </div>

            {totalNeedsAttention > 0 ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {/* Pending Submissions column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[hsl(var(--foreground))]">Pending Submissions ({pendingSubmissions.length})</span>
                    <Link href="/admin/submissions" className="text-[hsl(var(--accent-foreground))] hover:underline">
                      View all
                    </Link>
                  </div>
                  {pendingSubmissions.length > 0 ? (
                    <div className="space-y-2">
                      {pendingSubmissions.slice(0, 3).map((item) => (
                        <SubmissionRow key={item.id} submission={item} />
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-[hsl(var(--border))] p-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
                      No pending submissions.
                    </p>
                  )}
                </div>

                {/* Pending Reports column */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[hsl(var(--foreground))]">Pending Reports ({pendingReports.length})</span>
                    <Link href="/admin/reports" className="text-[hsl(var(--accent-foreground))] hover:underline">
                      View all
                    </Link>
                  </div>
                  {pendingReports.length > 0 ? (
                    <div className="space-y-2">
                      {pendingReports.slice(0, 3).map((report) => (
                        <div
                          key={report.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] p-3"
                          data-testid={`row-pending-report-${report.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-[hsl(var(--destructive)/.15)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--destructive))]">
                                {report.reason}
                              </span>
                              <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                                {formatDate(report.createdAt)}
                              </span>
                            </div>
                            <p className="mt-1.5 truncate text-xs font-bold text-[hsl(var(--foreground))]">
                              {report.resourceTitle || `Resource #${report.resourceId}`}
                            </p>
                            {report.explanation && (
                              <p className="mt-1 line-clamp-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                                {report.explanation}
                              </p>
                            )}
                          </div>
                          <Link
                            href="/admin/reports"
                            className="focus-ring shrink-0 rounded-lg bg-[hsl(var(--muted))] px-2.5 py-1 text-[11px] font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.8)]"
                          >
                            Review
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-[hsl(var(--border))] p-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
                      No pending reports.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center" data-testid="status-everything-updated">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="mt-3 text-sm font-bold text-[hsl(var(--foreground))]">Everything is up to date.</h3>
                <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                  No submissions or reports require moderator review right now.
                </p>
              </div>
            )}
          </div>

          {/* Section 4: Recent Resources & Library Health */}
          <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
            {/* Recently Added Resources */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6" data-testid="section-recent-resources">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-4">
                <div>
                  <p className="micro-label text-[hsl(var(--accent-foreground))]">Live catalog</p>
                  <h2 className="mt-1 text-lg font-bold">Recently Added Resources</h2>
                </div>
                <Link
                  href="/admin/resources"
                  className="focus-ring text-xs font-bold text-[hsl(var(--accent-foreground))] hover:underline"
                  data-testid="link-overview-manage-resources"
                >
                  Manage resources <ArrowRight size={13} className="ml-1 inline" />
                </Link>
              </div>

              {recentResources.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {recentResources.map((res) => (
                    <div
                      key={res.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] p-3 transition-colors"
                      data-testid={`row-recent-resource-${res.id}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <ResourceIcon type={res.resourceType} />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-[hsl(var(--foreground))]">{res.title}</p>
                          <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                            {res.subjectName ? `${res.subjectName} · ` : ""}{res.branchName ?? ""} · {formatDate(res.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {res.isVerified && <VerifiedBadge />}
                        {res.isFeatured && (
                          <span className="rounded-full bg-[hsl(var(--secondary)/.22)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">
                            Featured
                          </span>
                        )}
                        <a
                          href={res.googleDriveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="focus-ring rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                          title="Open Drive link"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">No resources in the library yet.</p>
              )}
            </div>

            {/* Library Health */}
            <div className="rounded-2xl bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))]">
              <p className="micro-label text-[hsl(var(--secondary))]">Library health</p>
              <h2 className="mt-2 text-lg font-bold">A little more signal, every week.</h2>
              <div className="mt-7 space-y-5">
                <Progress
                  label="Verified resources"
                  value={resources.length ? Math.round((resources.filter((r) => r.isVerified).length / resources.length) * 100) : 0}
                />
                <Progress
                  label="Featured resources"
                  value={resources.length ? Math.round((resources.filter((r) => r.isFeatured).length / resources.length) * 100) : 0}
                />
                <Progress
                  label="Submissions approved"
                  value={submissions.length ? Math.round((submissions.filter((s) => s.status === "approved").length / submissions.length) * 100) : 0}
                />
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/admin/resources"
                  className="focus-ring inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--secondary))]"
                  data-testid="link-overview-resources"
                >
                  Manage resources <ArrowRight size={13} />
                </Link>
                <Link
                  href="/admin/reports"
                  className="focus-ring inline-flex items-center gap-2 text-xs font-bold text-[hsl(var(--secondary))]"
                  data-testid="link-overview-reports"
                >
                  View reports <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
  warm,
  testId,
  isError,
}: {
  icon: typeof LibraryBig;
  label: string;
  value: number;
  detail: string;
  warm?: boolean;
  testId?: string;
  isError?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-[hsl(var(--card))] p-3.5 sm:p-4 ${isError ? "border-[hsl(var(--destructive)/.4)]" : "border-[hsl(var(--border))]"}`} data-testid={testId}>
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-xl sm:h-9 sm:w-9 ${
          isError ? "bg-[hsl(var(--destructive)/.15)] text-[hsl(var(--destructive))]" : warm ? "bg-[hsl(var(--secondary)/.3)] text-[hsl(var(--secondary-foreground))]" : "bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"
        }`}
      >
        <Icon size={16} />
      </div>
      <p className="mt-3 truncate text-xs font-semibold text-[hsl(var(--muted-foreground))]">{label}</p>
      <div className="mt-1 flex items-baseline justify-between gap-1">
        <p className={`display-font text-2xl font-bold sm:text-3xl ${isError ? "text-[hsl(var(--destructive))]" : ""}`}>
          {isError ? "—" : value}
        </p>
        <span className={`truncate text-[10px] font-bold ${isError ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--accent-foreground))]"}`}>
          {detail}
        </span>
      </div>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs font-semibold">
        <span className="text-[hsl(var(--primary-foreground)/.7)]">{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[hsl(var(--primary-foreground)/.15)]">
        <div className="h-full rounded-full bg-[hsl(var(--secondary))]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
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
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
  const approve = useApproveSubmission({ mutation: { onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() }); toast({ title: "Submission approved", description: "It's now published as a verified resource." }); } } });
  const reject = useRejectSubmission({ mutation: { onSuccess: () => { invalidate(); toast({ title: "Submission rejected" }); } } });
  const shown = submissions.filter((item) => filter === "all" || item.status === "pending");
  const isApproving = (id: number) => approve.isPending && approve.variables?.id === id;
  const isRejecting = (id: number) => reject.isPending && reject.variables?.id === id;
  const busyId = approve.isPending ? approve.variables?.id : reject.isPending ? reject.variables?.id : undefined;
  return <AdminLayout><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-bold">Submission queue</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Check context and link access before approving.</p></div><div className="flex rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1"><button type="button" onClick={() => setFilter("pending")} className={`focus-ring rounded-lg px-3 py-2 text-xs font-bold ${filter === "pending" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : ""}`} data-testid="button-filter-pending">Pending</button><button type="button" onClick={() => setFilter("all")} className={`focus-ring rounded-lg px-3 py-2 text-xs font-bold ${filter === "all" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : ""}`} data-testid="button-filter-all-submissions">All</button></div></div>{isLoading ? <Loader2 className="mx-auto my-10 animate-spin text-[hsl(var(--muted-foreground))]" size={24} /> : shown.length ? <div className="space-y-3">{shown.map((submission) => <SubmissionRow key={submission.id} submission={submission} actions={submission.status === "pending"} busy={busyId === submission.id} isApproving={isApproving(submission.id)} isRejecting={isRejecting(submission.id)} onApprove={() => approve.mutate({ id: submission.id })} onReject={() => { const reason = window.prompt("Reason for rejecting this submission (optional):"); if (reason === null) return; reject.mutate({ id: submission.id, data: { rejectionReason: reason || undefined } }); }} />)}</div> : <EmptyState title="The queue is clear" body="No submissions are waiting for a review right now. A rare, satisfying moment." />}</AdminLayout>;
}

function AdminReports() {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const { data: reports = [], isLoading } = useListReports();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
  const resolve = useResolveReport();
  const dismiss = useDismissReport();
  const shown = (reports as ReportItem[]).filter((item: ReportItem) => filter === "all" || item.status === "pending");

  const handleResolve = (id: number) => {
    resolve.mutate({ id }, {
      onSuccess: () => {
        invalidate();
        toast({ title: "Report resolved", description: "Marked as resolved." });
      },
    });
  };

  const handleDismiss = (id: number) => {
    dismiss.mutate({ id }, {
      onSuccess: () => {
        invalidate();
        toast({ title: "Report dismissed" });
      },
    });
  };

  const isResolving = (id: number) => resolve.isPending && resolve.variables?.id === id;
  const isDismissing = (id: number) => dismiss.isPending && dismiss.variables?.id === id;

  return (
    <AdminLayout>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Resource reports</h2>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Review issues reported by students.</p>
        </div>
        <div className="flex rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1">
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`focus-ring rounded-lg px-3 py-2 text-xs font-bold ${filter === "pending" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : ""}`}
            data-testid="button-filter-pending-reports"
          >
            Pending
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`focus-ring rounded-lg px-3 py-2 text-xs font-bold ${filter === "all" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : ""}`}
            data-testid="button-filter-all-reports"
          >
            All
          </button>
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto my-10 animate-spin text-[hsl(var(--muted-foreground))]" size={24} />
      ) : shown.length ? (
        <div className="space-y-3">
          {shown.map((report: ReportItem) => {
            const isBusy = isResolving(report.id) || isDismissing(report.id);
            return (
              <div key={report.id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] p-4" data-testid={`report-card-${report.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[hsl(var(--destructive)/.15)] px-2.5 py-0.5 text-[11px] font-bold text-[hsl(var(--destructive))]">
                        {report.reason}
                      </span>
                      {report.status === "pending" ? (
                        <span className="rounded-full bg-[hsl(var(--secondary)/.25)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">
                          Pending
                        </span>
                      ) : report.status === "resolved" ? (
                        <span className="rounded-full bg-[hsl(var(--accent))] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--accent-foreground))]">
                          Resolved
                        </span>
                      ) : (
                        <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                          Dismissed
                        </span>
                      )}
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        {formatDate(report.createdAt)}
                      </span>
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-[hsl(var(--foreground))]">
                      Resource: {report.resourceTitle || `ID #${report.resourceId}`}
                    </h3>

                    {report.googleDriveUrl && (
                      <p className="mt-1 text-xs">
                        <a
                          href={report.googleDriveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[hsl(var(--accent-foreground))] hover:underline inline-flex items-center gap-1"
                          data-testid={`link-report-drive-${report.id}`}
                        >
                          View Resource Link <ExternalLink size={12} />
                        </a>
                      </p>
                    )}

                    {report.explanation && (
                      <div className="mt-2 rounded-lg bg-[hsl(var(--muted)/.4)] p-2.5 text-xs text-[hsl(var(--foreground))]">
                        <span className="font-semibold text-[hsl(var(--muted-foreground))]">Student notes: </span>
                        {report.explanation}
                      </div>
                    )}

                    {report.status !== "pending" && report.resolvedBy && (
                      <p className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                        Handled by {report.resolvedBy}
                        {report.resolvedAt ? ` on ${formatDate(report.resolvedAt)}` : ""}
                      </p>
                    )}
                  </div>

                  {report.status === "pending" && (
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleResolve(report.id)}
                        disabled={isBusy}
                        className="focus-ring inline-flex items-center gap-1 rounded-lg bg-[hsl(var(--accent))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--accent-foreground))] disabled:opacity-60"
                        title="Mark resolved"
                        data-testid={`button-resolve-report-${report.id}`}
                      >
                        {isResolving(report.id) ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        <span>Resolve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDismiss(report.id)}
                        disabled={isBusy}
                        className="focus-ring inline-flex items-center gap-1 rounded-lg bg-[hsl(var(--muted))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.8)] disabled:opacity-60"
                        title="Dismiss report"
                        data-testid={`button-dismiss-report-${report.id}`}
                      >
                        {isDismissing(report.id) ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                        <span>Dismiss</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No reports" body="No resource issues have been reported." />
      )}
    </AdminLayout>
  );
}

function AdminEditResourceDialog({
  resource,
  open,
  onOpenChange,
}: {
  resource: Resource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const updateResource = useUpdateResource({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
        toast({ title: "Resource updated", description: "Changes saved successfully." });
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        setError(getErrorMessage(err) || "Failed to update resource.");
      },
    },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>("Lecture notes");
  const [googleDriveUrl, setGoogleDriveUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (resource) {
      setTitle(resource.title);
      setDescription(resource.description || "");
      setResourceType(resource.resourceType);
      setGoogleDriveUrl(resource.googleDriveUrl);
      setError("");
    }
  }, [resource, open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!resource) return;
    if (!title.trim()) {
      setError("Resource title is required.");
      return;
    }
    if (!googleDriveUrl.trim() || !isValidGoogleDriveUrl(googleDriveUrl)) {
      setError(googleDriveUrlHint);
      return;
    }
    setError("");
    updateResource.mutate({
      id: resource.id,
      data: {
        title: title.trim(),
        description: description.trim() || undefined,
        resourceType,
        googleDriveUrl: googleDriveUrl.trim(),
      },
    });
  };

  if (!resource) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Resource</DialogTitle>
          <DialogDescription>Update the details and link for this resource.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[hsl(var(--muted-foreground))]">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-style h-10 w-full text-xs"
              placeholder="Resource title"
              required
              data-testid="input-edit-resource-title"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                Resource Type
              </label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value as ResourceType)}
                className="input-style h-10 w-full text-xs"
                data-testid="select-edit-resource-type"
              >
                <option value="Lecture notes">Lecture notes</option>
                <option value="Previous year paper">Previous year paper</option>
                <option value="Lab manual">Lab manual</option>
                <option value="Assignment">Assignment</option>
                <option value="Reference">Reference</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                Path context
              </label>
              <p className="flex h-10 items-center truncate rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] px-3 text-xs text-[hsl(var(--muted-foreground))]">
                {resource.subjectName ?? "Subject"} · {resource.branchName ?? "Branch"}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[hsl(var(--muted-foreground))]">
              Google Drive Link *
            </label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={15} />
              <input
                type="url"
                value={googleDriveUrl}
                onChange={(e) => setGoogleDriveUrl(e.target.value)}
                className="input-style h-10 w-full pl-10 text-xs"
                placeholder="https://drive.google.com/..."
                required
                data-testid="input-edit-resource-url"
              />
            </div>
            <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">{googleDriveUrlHint}</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[hsl(var(--muted-foreground))]">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input-style w-full p-3 text-xs"
              placeholder="Helpful context or topic coverage"
              data-testid="input-edit-resource-description"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-[hsl(var(--destructive)/.1)] p-2.5 text-xs text-[hsl(var(--destructive))]">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={updateResource.isPending}
              className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold text-[hsl(var(--foreground))]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateResource.isPending}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60"
              data-testid="button-save-resource-edit"
            >
              {updateResource.isPending && <Loader2 size={13} className="animate-spin" />}
              Save changes
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminResources() {
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("All branches");
  const [year, setYear] = useState("All years");
  const [semester, setSemester] = useState("All semesters");
  const [subject, setSubject] = useState("All subjects");
  const [type, setType] = useState("All types");
  const [verification, setVerification] = useState<"all" | "verified" | "unverified">("all");
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const { data: resources = [], isLoading } = useListResources();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() });
  const updateResource = useUpdateResource({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Resource updated" });
      },
      onError: (err: unknown) => {
        toast({
          title: "Update failed",
          description: getErrorMessage(err) || "Could not update resource.",
          variant: "destructive",
        });
      },
    },
  });
  const deleteResource = useDeleteResource({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Resource deleted" });
      },
      onError: (err: unknown) => {
        toast({
          title: "Delete failed",
          description: getErrorMessage(err) || "Could not delete resource.",
          variant: "destructive",
        });
      },
    },
  });

  const availableBranches = useMemo(() => {
    return ["All branches", ...new Set(resources.map((r) => r.branchName).filter((v): v is string => Boolean(v)))];
  }, [resources]);

  const availableYears = useMemo(() => {
    const subset = branch === "All branches" ? resources : resources.filter((r) => r.branchName === branch);
    return ["All years", ...new Set(subset.map((r) => r.yearName).filter((v): v is string => Boolean(v)))];
  }, [resources, branch]);

  const availableSemesters = useMemo(() => {
    const subset = resources.filter((r) =>
      (branch === "All branches" || r.branchName === branch) &&
      (year === "All years" || r.yearName === year)
    );
    return ["All semesters", ...new Set(subset.map((r) => r.semesterName).filter((v): v is string => Boolean(v)))];
  }, [resources, branch, year]);

  const availableSubjects = useMemo(() => {
    const subset = resources.filter((r) =>
      (branch === "All branches" || r.branchName === branch) &&
      (year === "All years" || r.yearName === year) &&
      (semester === "All semesters" || r.semesterName === semester)
    );
    return ["All subjects", ...new Set(subset.map((r) => r.subjectName).filter((v): v is string => Boolean(v)))];
  }, [resources, branch, year, semester]);

  const handleBranchChange = (newBranch: string) => {
    setBranch(newBranch);
    setYear("All years");
    setSemester("All semesters");
    setSubject("All subjects");
  };

  const handleYearChange = (newYear: string) => {
    setYear(newYear);
    setSemester("All semesters");
    setSubject("All subjects");
  };

  const handleSemesterChange = (newSemester: string) => {
    setSemester(newSemester);
    setSubject("All subjects");
  };

  const hasActiveFilters = Boolean(
    query.trim() ||
    branch !== "All branches" ||
    year !== "All years" ||
    semester !== "All semesters" ||
    subject !== "All subjects" ||
    type !== "All types" ||
    verification !== "all" ||
    onlyFeatured ||
    onlyNew
  );

  const clearFilters = () => {
    setQuery("");
    setBranch("All branches");
    setYear("All years");
    setSemester("All semesters");
    setSubject("All subjects");
    setType("All types");
    setVerification("all");
    setOnlyFeatured(false);
    setOnlyNew(false);
  };

  const filtered = useMemo(() => {
    const queryWords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return resources.filter((resource) => {
      const haystack = `${resource.title} ${resource.subjectName ?? ""} ${resource.branchName ?? ""} ${resource.yearName ?? ""} ${resource.semesterName ?? ""} ${resource.resourceType} ${resource.description ?? ""}`.toLowerCase();
      const matchesQuery = queryWords.length === 0 || queryWords.every((word) => haystack.includes(word));
      const matchesBranch = branch === "All branches" || resource.branchName === branch;
      const matchesYear = year === "All years" || resource.yearName === year;
      const matchesSemester = semester === "All semesters" || resource.semesterName === semester;
      const matchesSubject = subject === "All subjects" || resource.subjectName === subject;
      const matchesType = type === "All types" || resource.resourceType === type;
      const matchesVerification =
        verification === "all" ||
        (verification === "verified" && resource.isVerified) ||
        (verification === "unverified" && !resource.isVerified);
      const matchesFeatured = !onlyFeatured || resource.isFeatured;
      const matchesNew = !onlyNew || resource.isNew;

      return (
        matchesQuery &&
        matchesBranch &&
        matchesYear &&
        matchesSemester &&
        matchesSubject &&
        matchesType &&
        matchesVerification &&
        matchesFeatured &&
        matchesNew
      );
    });
  }, [resources, query, branch, year, semester, subject, type, verification, onlyFeatured, onlyNew]);

  const toggle = (resource: Resource, key: "isNew" | "isFeatured" | "isVerified") => {
    if (updateResource.isPending || deleteResource.isPending) return;
    updateResource.mutate({ id: resource.id, data: { [key]: !resource[key] } });
  };

  const remove = (id: number) => {
    if (deleteResource.isPending || updateResource.isPending) return;
    if (window.confirm("Remove this resource from the library?")) {
      deleteResource.mutate({ id });
    }
  };

  return (
    <AdminLayout>
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold">Resource management</h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Search, filter, edit, and control what students see on the shelf.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-style h-10 w-full pl-10 pr-9 text-xs"
              placeholder="Search title, subject, path..."
              data-testid="input-admin-resource-search"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="focus-ring absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                aria-label="Clear search"
                data-testid="button-clear-admin-search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-4 space-y-3 rounded-xl border border-[hsl(var(--border)/.6)] bg-[hsl(var(--muted)/.2)] p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            <select
              value={branch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="input-style h-9 text-xs"
              data-testid="select-admin-filter-branch"
              aria-label="Filter by branch"
            >
              {availableBranches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => handleYearChange(e.target.value)}
              className="input-style h-9 text-xs"
              data-testid="select-admin-filter-year"
              aria-label="Filter by year"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select
              value={semester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="input-style h-9 text-xs"
              data-testid="select-admin-filter-semester"
              aria-label="Filter by semester"
            >
              {availableSemesters.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input-style h-9 text-xs"
              data-testid="select-admin-filter-subject"
              aria-label="Filter by subject"
            >
              {availableSubjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="input-style h-9 text-xs"
              data-testid="select-admin-filter-type"
              aria-label="Filter by resource type"
            >
              <option value="All types">All types</option>
              <option value="Lecture notes">Lecture notes</option>
              <option value="Previous year paper">Previous year paper</option>
              <option value="Lab manual">Lab manual</option>
              <option value="Assignment">Assignment</option>
              <option value="Reference">Reference</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <select
              value={verification}
              onChange={(e) => setVerification(e.target.value as "all" | "verified" | "unverified")}
              className="input-style h-8 text-xs font-semibold"
              data-testid="select-admin-filter-verification"
              aria-label="Filter by verification"
            >
              <option value="all">All verification</option>
              <option value="verified">Verified only</option>
              <option value="unverified">Unverified only</option>
            </select>

            <ToggleButton
              label="Featured"
              active={onlyFeatured}
              onClick={() => setOnlyFeatured(!onlyFeatured)}
              testId="button-admin-filter-featured"
            />
            <ToggleButton
              label="New"
              active={onlyNew}
              onClick={() => setOnlyNew(!onlyNew)}
              testId="button-admin-filter-new"
            />

            <div className="ml-auto flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-semibold text-[hsl(var(--muted-foreground))]">
                <Filter size={13} /> {filtered.length} of {resources.length} shown
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="focus-ring font-bold text-[hsl(var(--accent-foreground))] hover:underline"
                  data-testid="button-admin-clear-filters"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Resources Content */}
        {isLoading ? (
          <Loader2 className="mx-auto my-10 animate-spin text-[hsl(var(--muted-foreground))]" size={24} />
        ) : filtered.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] text-[10px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">
                  <th className="px-3 py-3 font-bold">Resource</th>
                  <th className="px-3 py-3 font-bold">Path</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-3 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((resource) => {
                  const isUpdatingVerified = updateResource.isPending && updateResource.variables?.id === resource.id && updateResource.variables?.data?.isVerified !== undefined;
                  const isUpdatingFeatured = updateResource.isPending && updateResource.variables?.id === resource.id && updateResource.variables?.data?.isFeatured !== undefined;
                  const isUpdatingNew = updateResource.isPending && updateResource.variables?.id === resource.id && updateResource.variables?.data?.isNew !== undefined;
                  const isDeleting = deleteResource.isPending && deleteResource.variables?.id === resource.id;
                  const isRowBusy = isUpdatingVerified || isUpdatingFeatured || isUpdatingNew || isDeleting;

                  return (
                    <tr key={resource.id} className="border-b border-[hsl(var(--border)/.7)] last:border-0 hover:bg-[hsl(var(--muted)/.2)]" data-testid={`row-admin-resource-${resource.id}`}>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <ResourceIcon type={resource.resourceType} />
                          <div className="min-w-0">
                            <p className="max-w-[260px] truncate text-sm font-bold text-[hsl(var(--foreground))]">
                              {resource.title}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                              <span>{resource.resourceType}</span>
                              <span>·</span>
                              <a
                                href={resource.googleDriveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-[hsl(var(--accent-foreground))] hover:underline"
                                data-testid={`link-admin-drive-${resource.id}`}
                              >
                                Drive <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                        <div>
                          <p className="font-bold text-[hsl(var(--foreground))]">{resource.subjectName ?? "—"}</p>
                          <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">
                            {[resource.branchName, resource.yearName, resource.semesterName].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <VerifiedBadge verified={resource.isVerified} />
                          {resource.isFeatured && (
                            <span className="rounded-full bg-[hsl(var(--secondary)/.22)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">
                              Featured
                            </span>
                          )}
                          {resource.isNew && (
                            <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-bold">
                              New
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            disabled={isRowBusy}
                            onClick={() => toggle(resource, "isVerified")}
                            className="focus-ring rounded-lg p-2 text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--accent))] disabled:opacity-50"
                            title={resource.isVerified ? "Mark unverified" : "Mark verified"}
                            aria-label={`Toggle verified for ${resource.title}`}
                            data-testid={`button-toggle-verified-${resource.id}`}
                          >
                            {isUpdatingVerified ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />}
                          </button>
                          <button
                            type="button"
                            disabled={isRowBusy}
                            onClick={() => toggle(resource, "isFeatured")}
                            className="focus-ring rounded-lg p-2 text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary)/.25)] disabled:opacity-50"
                            title={resource.isFeatured ? "Unfeature" : "Feature resource"}
                            aria-label={`Toggle featured for ${resource.title}`}
                            data-testid={`button-toggle-featured-${resource.id}`}
                          >
                            {isUpdatingFeatured ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                          </button>
                          <button
                            type="button"
                            disabled={isRowBusy}
                            onClick={() => toggle(resource, "isNew")}
                            className="focus-ring rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-50"
                            title={resource.isNew ? "Remove new badge" : "Mark as new"}
                            aria-label={`Toggle new for ${resource.title}`}
                            data-testid={`button-toggle-new-${resource.id}`}
                          >
                            {isUpdatingNew ? <Loader2 size={15} className="animate-spin" /> : <MoreHorizontal size={15} />}
                          </button>
                          <button
                            type="button"
                            disabled={isRowBusy}
                            onClick={() => setEditingResource(resource)}
                            className="focus-ring rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] disabled:opacity-50"
                            title="Edit resource"
                            aria-label={`Edit ${resource.title}`}
                            data-testid={`button-edit-resource-${resource.id}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            disabled={isRowBusy}
                            onClick={() => remove(resource.id)}
                            className="focus-ring rounded-lg p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)] disabled:opacity-50"
                            title="Delete resource"
                            aria-label={`Delete ${resource.title}`}
                            data-testid={`button-delete-resource-${resource.id}`}
                          >
                            {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : resources.length === 0 ? (
          <EmptyState
            title="The library is empty"
            body="Approved submissions and newly published resources will appear here."
          />
        ) : (
          <div className="py-12 text-center" data-testid="status-admin-no-results">
            <p className="text-sm font-bold text-[hsl(var(--foreground))]">No resources found</p>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Try changing your search or filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="focus-ring mt-4 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))]"
              data-testid="button-clear-filters-empty"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      <AdminEditResourceDialog
        resource={editingResource}
        open={Boolean(editingResource)}
        onOpenChange={(open) => {
          if (!open) setEditingResource(null);
        }}
      />
    </AdminLayout>
  );
}

function ToggleButton({ label, active, onClick, testId }: { label: string; active: boolean; onClick: () => void; testId: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
        active
          ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.25)] text-[hsl(var(--secondary-foreground))]"
          : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)]"
      }`}
      data-testid={testId}
    >
      {label}
    </button>
  );
}

function AdminCurriculumTemplates() {
  const { data: templates = [], isLoading } = useListCurriculumTemplates();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CurriculumTemplateItem | null>(null);
  const [managingTemplate, setManagingTemplate] = useState<CurriculumTemplateItem | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState<CurriculumTemplateItem | null>(null);

  const deleteTemplate = useDeleteCurriculumTemplate();

  const handleDelete = (tpl: CurriculumTemplateItem) => {
    if (deleteTemplate.isPending) return;
    if (window.confirm(`Delete the curriculum template for ${tpl.branchShortName} · ${tpl.yearName} · ${tpl.semesterName}? This will remove its template subjects.`)) {
      deleteTemplate.mutate(
        { id: tpl.id },
        {
          onSuccess: () => {
            toast({ title: "Template deleted", description: "The curriculum template was removed." });
          },
        },
      );
    }
  };

  const currentManaging = templates.find((t) => t.id === managingTemplate?.id) || managingTemplate;
  const currentApplying = templates.find((t) => t.id === applyingTemplate?.id) || applyingTemplate;

  return (
    <AdminLayout>
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold">Curriculum Templates</h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Create and manage blueprint subject lists by branch, year, and semester to apply to the catalog.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90"
            data-testid="button-create-template"
          >
            <Plus size={14} /> Create Template
          </button>
        </div>

        {isLoading ? (
          <Loader2 className="mx-auto my-10 animate-spin text-[hsl(var(--muted-foreground))]" size={24} />
        ) : templates.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="flex flex-col justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] p-4 sm:p-5"
                data-testid={`card-template-${tpl.id}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[hsl(var(--secondary)/.25)] px-2.5 py-0.5 text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">
                      {tpl.branchShortName}
                    </span>
                    <span className="rounded-full bg-[hsl(var(--muted))] px-2.5 py-0.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                      {tpl.subjectCount} {tpl.subjectCount === 1 ? "subject" : "subjects"}
                    </span>
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-[hsl(var(--foreground))]">
                    {tpl.branchName}
                  </h3>
                  <p className="text-xs font-semibold text-[hsl(var(--accent-foreground))]">
                    {tpl.yearName} · {tpl.semesterName}
                  </p>

                  {tpl.name && (
                    <p className="mt-2 text-xs italic text-[hsl(var(--muted-foreground))]">
                      "{tpl.name}"
                    </p>
                  )}

                  {tpl.subjects.length > 0 ? (
                    <div className="mt-4 space-y-1.5 border-t border-[hsl(var(--border)/.6)] pt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        Subjects blueprint:
                      </p>
                      <ul className="space-y-1 text-xs text-[hsl(var(--foreground))]">
                        {tpl.subjects.slice(0, 4).map((s, idx) => (
                          <li key={s.id} className="truncate flex items-center gap-1.5">
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{idx + 1}.</span>
                            <span className="font-semibold">{s.name}</span>
                            {s.code && (
                              <span className="rounded bg-[hsl(var(--muted))] px-1 py-0.2 text-[9px] font-bold text-[hsl(var(--muted-foreground))]">
                                {s.code}
                              </span>
                            )}
                          </li>
                        ))}
                        {tpl.subjects.length > 4 && (
                          <li className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                            + {tpl.subjects.length - 4} more subjects
                          </li>
                        )}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-4 border-t border-[hsl(var(--border)/.6)] pt-3 text-xs text-[hsl(var(--muted-foreground))]">
                      No subjects added to this template yet.
                    </p>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[hsl(var(--border))] pt-3">
                  <button
                    type="button"
                    onClick={() => setManagingTemplate(tpl)}
                    className="focus-ring inline-flex items-center gap-1 text-xs font-bold text-[hsl(var(--accent-foreground))] hover:underline"
                    data-testid={`button-manage-template-subjects-${tpl.id}`}
                  >
                    <BookOpen size={13} /> Manage Subjects
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setApplyingTemplate(tpl)}
                      className="focus-ring inline-flex items-center gap-1 rounded-lg bg-[hsl(var(--primary))] px-2.5 py-1 text-[11px] font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90"
                      title="Apply template to catalog"
                      data-testid={`button-apply-template-${tpl.id}`}
                    >
                      <Sparkles size={11} /> Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTemplate(tpl)}
                      className="focus-ring rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                      title="Edit template name"
                      aria-label="Edit template"
                      data-testid={`button-edit-template-${tpl.id}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={deleteTemplate.isPending}
                      onClick={() => handleDelete(tpl)}
                      className="focus-ring rounded-lg p-1.5 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)] disabled:opacity-50"
                      title="Delete template"
                      aria-label="Delete template"
                      data-testid={`button-delete-template-${tpl.id}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No curriculum templates yet"
            body="Create your first blueprint template to define standard subject lists for branches and semesters."
            action={
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"
                data-testid="button-empty-create-template"
              >
                <Plus size={14} /> Create Template
              </button>
            }
          />
        )}
      </div>

      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        existingTemplates={templates}
      />

      <EditTemplateDialog
        template={editingTemplate}
        open={Boolean(editingTemplate)}
        onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}
      />

      {currentManaging && (
        <TemplateSubjectManagerDialog
          template={currentManaging}
          open={Boolean(managingTemplate)}
          onOpenChange={(open) => { if (!open) setManagingTemplate(null); }}
        />
      )}

      {currentApplying && (
        <ApplyTemplateDialog
          template={currentApplying}
          open={Boolean(applyingTemplate)}
          onOpenChange={(open) => { if (!open) setApplyingTemplate(null); }}
        />
      )}
    </AdminLayout>
  );
}

function CreateTemplateDialog({
  open,
  onOpenChange,
  existingTemplates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingTemplates: CurriculumTemplateItem[];
}) {
  const [branchId, setBranchId] = useState<number | undefined>(undefined);
  const [yearId, setYearId] = useState<number | undefined>(undefined);
  const [semesterId, setSemesterId] = useState<number | undefined>(undefined);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const { data: branches = [] } = useListBranches({ includeInactive: true });
  const { data: years = [] } = useListYears({ branchId: branchId as number }, qOpts(!!branchId));
  const { data: semesters = [] } = useListSemesters({ yearId: yearId as number }, qOpts(!!yearId));

  useEffect(() => {
    if (branches.length && branchId === undefined) setBranchId(branches[0]?.id);
  }, [branches, branchId]);

  useEffect(() => {
    if (years.length) {
      setYearId((curr) => (curr && years.some((y) => y.id === curr) ? curr : years[0]?.id));
    } else {
      setYearId(undefined);
    }
  }, [years]);

  useEffect(() => {
    if (semesters.length) {
      setSemesterId((curr) => (curr && semesters.some((s) => s.id === curr) ? curr : semesters[0]?.id));
    } else {
      setSemesterId(undefined);
    }
  }, [semesters]);

  const isDuplicate = Boolean(
    semesterId && existingTemplates.some((t) => t.semesterId === semesterId),
  );

  const createTemplate = useCreateCurriculumTemplate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!branchId || !yearId || !semesterId) {
      setError("Please select a Branch, Year, and Semester.");
      return;
    }
    if (isDuplicate) {
      setError("A curriculum template for this semester already exists.");
      return;
    }

    createTemplate.mutate(
      {
        data: {
          branchId,
          yearId,
          semesterId,
          name: name.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Template created", description: "You can now add subjects to this template." });
          setName("");
          setError("");
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          setError(getErrorMessage(err) || "Failed to create template.");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) { setError(""); setName(""); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Curriculum Template</DialogTitle>
          <DialogDescription>
            Choose the branch, year, and semester for this curriculum blueprint.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">Branch *</label>
            <select
              value={branchId ?? ""}
              onChange={(e) => setBranchId(Number(e.target.value))}
              className="input-style h-10 w-full text-xs"
              data-testid="select-template-branch"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.shortName} — {b.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">Year *</label>
              <select
                value={yearId ?? ""}
                onChange={(e) => setYearId(Number(e.target.value))}
                className="input-style h-10 w-full text-xs"
                disabled={!years.length}
                data-testid="select-template-year"
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">Semester *</label>
              <select
                value={semesterId ?? ""}
                onChange={(e) => setSemesterId(Number(e.target.value))}
                className="input-style h-10 w-full text-xs"
                disabled={!semesters.length}
                data-testid="select-template-semester"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">
              Template label (optional)
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2022 Scheme CSE 3rd Sem"
              className="input-style h-10 w-full text-xs"
              data-testid="input-template-name"
            />
          </div>

          {isDuplicate && (
            <div className="flex items-start gap-2 rounded-xl bg-[hsl(var(--secondary)/.15)] p-3 text-xs font-semibold text-[hsl(var(--secondary-foreground))]">
              <CircleAlert size={15} className="mt-0.5 shrink-0" />
              <span>A curriculum template already exists for this branch, year, and semester.</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]">
              <CircleAlert size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createTemplate.isPending || isDuplicate || !semesterId}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60"
              data-testid="button-submit-create-template"
            >
              {createTemplate.isPending && <Loader2 size={13} className="animate-spin" />}
              Create Template
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTemplateDialog({
  template,
  open,
  onOpenChange,
}: {
  template: CurriculumTemplateItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const updateTemplate = useUpdateCurriculumTemplate();

  useEffect(() => {
    if (template) setName(template.name || "");
  }, [template, open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!template) return;

    updateTemplate.mutate(
      {
        id: template.id,
        data: { name: name.trim() },
      },
      {
        onSuccess: () => {
          toast({ title: "Template updated" });
          onOpenChange(false);
        },
      },
    );
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Template Label</DialogTitle>
          <DialogDescription>
            {template.branchShortName} · {template.yearName} · {template.semesterName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">Template label</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2022 Scheme CSE 3rd Sem"
              className="input-style h-10 w-full text-xs"
              data-testid="input-edit-template-name"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateTemplate.isPending}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60"
              data-testid="button-save-template"
            >
              {updateTemplate.isPending && <Loader2 size={13} className="animate-spin" />}
              Save Changes
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TemplateSubjectManagerDialog({
  template,
  open,
  onOpenChange,
}: {
  template: CurriculumTemplateItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [subName, setSubName] = useState("");
  const [subCode, setSubCode] = useState("");
  const [subDesc, setSubDesc] = useState("");
  const [editingSub, setEditingSub] = useState<CurriculumTemplateSubjectItem | null>(null);

  const addSubject = useCreateTemplateSubject();
  const deleteSubject = useDeleteTemplateSubject();
  const reorderSubjects = useReorderTemplateSubjects();

  const handleAddSubject = (e: FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || addSubject.isPending) return;

    addSubject.mutate(
      {
        templateId: template.id,
        data: {
          name: subName.trim(),
          code: subCode.trim() || undefined,
          description: subDesc.trim() || undefined,
          displayOrder: template.subjects.length,
        },
      },
      {
        onSuccess: () => {
          setSubName("");
          setSubCode("");
          setSubDesc("");
          toast({ title: "Subject added to template" });
        },
      },
    );
  };

  const handleMove = (sub: CurriculumTemplateSubjectItem, direction: -1 | 1) => {
    if (reorderSubjects.isPending) return;
    const sorted = [...template.subjects].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((s) => s.id === sub.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;

    reorderSubjects.mutate({
      templateId: template.id,
      data: {
        order: [
          { id: sub.id, displayOrder: swapWith.displayOrder },
          { id: swapWith.id, displayOrder: sub.displayOrder },
        ],
      },
    });
  };

  const handleDeleteSub = (subId: number) => {
    if (deleteSubject.isPending) return;
    deleteSubject.mutate(
      { templateId: template.id, subjectId: subId },
      {
        onSuccess: () => {
          toast({ title: "Subject removed from template" });
        },
      },
    );
  };

  const sortedSubjects = [...template.subjects].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[hsl(var(--secondary)/.25)] px-2.5 py-0.5 text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">
                {template.branchShortName}
              </span>
              <DialogTitle className="text-lg">
                Manage Template Subjects
              </DialogTitle>
            </div>
            <DialogDescription>
              {template.branchName} · {template.yearName} · {template.semesterName}
              {template.name ? ` (${template.name})` : ""}
            </DialogDescription>
          </DialogHeader>

          {/* Add Subject Form */}
          <form onSubmit={handleAddSubject} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-4 space-y-3">
            <p className="text-xs font-bold text-[hsl(var(--foreground))]">Add Subject to Blueprint</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <input
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="Subject name (e.g. Operating Systems)"
                  className="input-style h-9 w-full text-xs"
                  required
                  data-testid="input-template-subject-name"
                />
              </div>
              <div>
                <input
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  placeholder="Code (e.g. 21CS34)"
                  className="input-style h-9 w-full text-xs"
                  data-testid="input-template-subject-code"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <input
                value={subDesc}
                onChange={(e) => setSubDesc(e.target.value)}
                placeholder="Optional description / topics note"
                className="input-style h-9 flex-1 text-xs"
                data-testid="input-template-subject-description"
              />
              <button
                type="submit"
                disabled={addSubject.isPending || !subName.trim()}
                className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60"
                data-testid="button-add-template-subject"
              >
                {addSubject.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Add Subject
              </button>
            </div>
          </form>

          {/* Subjects List */}
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Subjects in this template ({sortedSubjects.length})
              </p>
            </div>

            {sortedSubjects.length === 0 ? (
              <p className="py-6 text-center text-xs text-[hsl(var(--muted-foreground))]">
                No subjects in this template yet. Use the form above to add subjects.
              </p>
            ) : (
              <div className="space-y-2">
                {sortedSubjects.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-xs"
                    data-testid={`row-template-subject-${sub.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="flex shrink-0 flex-col">
                        <button
                          type="button"
                          disabled={reorderSubjects.isPending || idx === 0}
                          onClick={() => handleMove(sub, -1)}
                          className="focus-ring text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ChevronDown size={11} className="rotate-180" />
                        </button>
                        <button
                          type="button"
                          disabled={reorderSubjects.isPending || idx === sortedSubjects.length - 1}
                          onClick={() => handleMove(sub, 1)}
                          className="focus-ring text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ChevronDown size={11} />
                        </button>
                      </div>

                      <span className="font-bold text-[hsl(var(--muted-foreground))] w-5 text-center">
                        {idx + 1}.
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-[hsl(var(--foreground))]">{sub.name}</span>
                          {sub.code && (
                            <span className="rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--accent-foreground))]">
                              {sub.code}
                            </span>
                          )}
                        </div>
                        {sub.description && (
                          <p className="truncate text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
                            {sub.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingSub(sub)}
                        className="focus-ring rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                        title="Edit subject"
                        aria-label="Edit subject"
                        data-testid={`button-edit-template-subject-${sub.id}`}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSub(sub.id)}
                        disabled={deleteSubject.isPending}
                        className="focus-ring rounded-lg p-1.5 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)] disabled:opacity-50"
                        title="Remove subject from template"
                        aria-label="Delete subject"
                        data-testid={`button-delete-template-subject-${sub.id}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold"
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditTemplateSubjectDialog
        templateId={template.id}
        subject={editingSub}
        open={Boolean(editingSub)}
        onOpenChange={(open) => { if (!open) setEditingSub(null); }}
      />
    </>
  );
}

function EditTemplateSubjectDialog({
  templateId,
  subject,
  open,
  onOpenChange,
}: {
  templateId: number;
  subject: CurriculumTemplateSubjectItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const updateSub = useUpdateTemplateSubject();

  useEffect(() => {
    if (subject) {
      setName(subject.name);
      setCode(subject.code || "");
      setDescription(subject.description || "");
    }
  }, [subject, open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!subject || !name.trim()) return;

    updateSub.mutate(
      {
        templateId,
        subjectId: subject.id,
        data: {
          name: name.trim(),
          code: code.trim(),
          description: description.trim(),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Subject updated" });
          onOpenChange(false);
        },
      },
    );
  };

  if (!subject) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Template Subject</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">Subject name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-style h-10 w-full text-xs"
              required
              data-testid="input-edit-sub-name"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">Subject code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 21CS34"
              className="input-style h-10 w-full text-xs"
              data-testid="input-edit-sub-code"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input-style w-full p-2.5 text-xs"
              data-testid="input-edit-sub-description"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateSub.isPending || !name.trim()}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60"
              data-testid="button-save-sub-edit"
            >
              {updateSub.isPending && <Loader2 size={13} className="animate-spin" />}
              Save Changes
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ApplyTemplateDialog({
  template,
  open,
  onOpenChange,
}: {
  template: CurriculumTemplateItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const applyTemplate = useApplyCurriculumTemplate();
  const sortedSubjects = [...template.subjects].sort((a, b) => a.displayOrder - b.displayOrder);

  const handleApply = () => {
    if (applyTemplate.isPending) return;

    applyTemplate.mutate(
      { templateId: template.id },
      {
        onSuccess: (res) => {
          toast({
            title: "Template applied",
            description: res.message,
          });
          onOpenChange(false);
        },
        onError: (err: unknown) => {
          toast({
            variant: "destructive",
            title: "Apply failed",
            description: getErrorMessage(err) || "Failed to apply template.",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[hsl(var(--accent-foreground))]">
            <Sparkles size={18} />
            <DialogTitle>Apply Curriculum Template</DialogTitle>
          </div>
          <DialogDescription>
            Apply subjects from this blueprint into the live academic catalog.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)] p-4 text-xs space-y-2">
          <div className="grid grid-cols-3 gap-2 font-semibold">
            <div>
              <span className="block text-[10px] text-[hsl(var(--muted-foreground))] uppercase">Branch</span>
              <span>{template.branchShortName}</span>
            </div>
            <div>
              <span className="block text-[10px] text-[hsl(var(--muted-foreground))] uppercase">Year</span>
              <span>{template.yearName}</span>
            </div>
            <div>
              <span className="block text-[10px] text-[hsl(var(--muted-foreground))] uppercase">Semester</span>
              <span>{template.semesterName}</span>
            </div>
          </div>
          {template.name && (
            <p className="text-[11px] italic text-[hsl(var(--muted-foreground))] pt-1 border-t border-[hsl(var(--border)/.5)]">
              Template label: "{template.name}"
            </p>
          )}
        </div>

        <div className="space-y-2 mt-2">
          <p className="text-xs font-bold text-[hsl(var(--foreground))]">
            Blueprint subjects to create ({sortedSubjects.length}):
          </p>

          {sortedSubjects.length === 0 ? (
            <p className="text-xs text-[hsl(var(--destructive))] p-3 rounded-xl bg-[hsl(var(--destructive)/.1)]">
              This template has no subjects. Please add subjects to the template before applying.
            </p>
          ) : (
            <ol className="space-y-1.5 text-xs rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 max-h-48 overflow-y-auto">
              {sortedSubjects.map((s, idx) => (
                <li key={s.id} className="flex items-center justify-between gap-2 border-b border-[hsl(var(--border)/.5)] pb-1 last:border-0 last:pb-0">
                  <span className="font-semibold">
                    {idx + 1}. {s.name}
                  </span>
                  {s.code && (
                    <span className="rounded bg-[hsl(var(--muted))] px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--accent-foreground))]">
                      {s.code}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}

          <div className="rounded-xl border border-[hsl(var(--secondary)/.3)] bg-[hsl(var(--secondary)/.1)] p-3 text-xs leading-5 text-[hsl(var(--secondary-foreground))]">
            <span className="font-bold">Safe Sync Note: </span>
            Any subjects in this template that already exist in the catalog for this semester will be skipped to prevent duplicate records.
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applyTemplate.isPending || sortedSubjects.length === 0}
            className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60"
            data-testid="button-confirm-apply-template"
          >
            {applyTemplate.isPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Apply to Catalog
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
    <Route path="/forgot-password"><ForgotPasswordPage /></Route>
    <Route path="/reset-password"><ResetPasswordPage /></Route>
    <Route path="/admin"><RequireAdmin><AdminOverview /></RequireAdmin></Route>
    <Route path="/admin/catalog"><RequireAdmin><AdminLayout><AdminCatalog /></AdminLayout></RequireAdmin></Route>
    <Route path="/admin/templates"><RequireAdmin><AdminCurriculumTemplates /></RequireAdmin></Route>
    <Route path="/admin/submissions"><RequireAdmin><AdminSubmissions /></RequireAdmin></Route>
    <Route path="/admin/resources"><RequireAdmin><AdminResources /></RequireAdmin></Route>
    <Route path="/admin/reports"><RequireAdmin><AdminReports /></RequireAdmin></Route>
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><AuthProvider><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}><Shell><AppRouter /></Shell></WouterRouter><ApiWakeOverlay /><Toaster /></TooltipProvider></AuthProvider></QueryClientProvider>;
}

export default App;
