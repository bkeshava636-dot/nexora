import { type FormEvent, type ReactNode, memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link, Redirect, Route, Switch, Router as WouterRouter, useLocation, useParams } from "wouter";
import {
  ArrowLeft, ArrowRight, BarChart3, Bug, MessageSquare, MessageSquarePlus, BadgeCheck, BookOpen, Calendar, Check, CheckCircle2, ChevronDown, ChevronRight,
  CircleAlert, Clock3, Download, ExternalLink, Eye, EyeOff, FileArchive, FileDown, FileText, Filter, Flag, FolderOpen, GitBranch, GraduationCap, KeyRound, Layers3,
  LayoutDashboard, LibraryBig, Link2, Loader2, Lock, LogOut, Menu, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Send, ShieldCheck,
  SlidersHorizontal, Sparkles, Trash2, Upload, Users, X, Zap,
} from "lucide-react";
import { ApiWakeOverlay } from "@/components/api-wake-overlay";
import { BuyMePaneerFooter } from "@/components/buy-me-paneer";
import { FeedbackDialog } from "@/components/feedback-dialog";
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
  getListSemesterQpsQueryKey,
  getListSemestersQueryKey,
  getListIaDepartmentsQueryKey,
  getListSemesterQpDepartmentsQueryKey,
  getListSubjectsQueryKey,
  getListSubmissionsQueryKey,
  getListYearsQueryKey,
  getSubmissionModeQueryKey,
  useApplyCurriculumTemplate,
  useApproveSubmission,
  useChangePassword,
  useCreateBranch,
  useCreateCurriculumTemplate,
  useCreateReport,
  useCreateSemester,
  useCreateSemesterQp,
  useCreateSubject,
  useCreateSubmission,
  useCreateTemplateSubject,
  useCreateYear,
  useDeleteBranch,
  useDeleteCurriculumTemplate,
  useDeleteResource,
  useDeleteSemester,
  useDeleteSemesterQp,
  useDeleteSubject,
  useDeleteTemplateSubject,
  useDeleteYear,
  useDismissReport,
  useForgotPassword,
  useGetBranch,
  useGetCurriculumTemplate,
  useGetSemester,
  useGetSubject,
  useGetSubmissionMode,
  useGetTotalVisits,
  useGetYear,
  useListBranches,
  useListCurriculumTemplates,
  useListReports,
  useListResources,
  useListSemesterQps,
  useCreateFeedback,
  useListFeedback,
  useUpdateFeedback,
  useDeleteFeedback,
  getListFeedbackQueryKey,
  type Feedback,
  type FeedbackCategory,
  type FeedbackStatus,
  useListSemesterQpDepartments, useCreateSemesterQpDepartment, useUpdateSemesterQpDepartment, useListIaDepartments, useCreateIaDepartment, useUpdateIaDepartment,

  useListIaPapers, getListIaPapersQueryKey,
  useListQuickLinks,
  useGetQuickLink,
  useCreateQuickLink,
  useUpdateQuickLink,
  useToggleQuickLinkStatus,
  useDeleteQuickLink,
  getListQuickLinksQueryKey,
  type ImportantLinkItem,
  type CreateQuickLinkInput,
  type UpdateQuickLinkInput,
  useListSemesters,
  useRecordVisit,
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
  useUpdateSemesterQp,
  useUpdateIaPaper,
  useCreateIaPaper,
  useDeleteIaPaper,
  useUpdateSubject,
  useUpdateSubmissionMode,
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
  type SemesterQpItem,
  type IaPaperItem,
  type Submission,
  type SubmissionApprovalMode,
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const nav = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/resources", label: "Resource library", icon: LibraryBig },
    { href: "/pyqs", label: "PYQs", icon: GraduationCap },
    { href: "/quick-links", label: "Quick Links", icon: Link2 },
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

    {!location.startsWith("/admin") && (
      <button
        type="button"
        onClick={() => setFeedbackOpen(true)}
        className="focus-ring fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:border-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--secondary-foreground))] cursor-pointer active:scale-95 group"
        data-testid="button-floating-feedback"
        aria-label="Feedback and Bug Reports"
      >
        <MessageSquarePlus size={16} className="text-[hsl(var(--secondary))] group-hover:text-current transition-colors" />
        <span>Feedback</span>
      </button>
    )}

    <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
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

const ResourceCard = memo(function ResourceCard({
  resource,
  compact = false,
}: {
  resource: Resource;
  compact?: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const pathParts = [resource.branchName, resource.yearName, resource.semesterName, resource.subjectName].filter(Boolean);
  const formattedDate = resource.createdAt ? formatDate(resource.createdAt) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setDetailsOpen(true)}
        className="card-lift focus-ring group flex h-full flex-col justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-left sm:p-5"
        data-testid={`card-resource-${resource.id}`}
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-md bg-[hsl(var(--muted))] px-2.5 py-1 text-xs font-bold text-[hsl(var(--foreground))]">
              {resource.resourceType}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
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

          <h3 className="mt-3 text-sm font-bold leading-snug group-hover:text-[hsl(var(--accent-foreground))] transition-colors line-clamp-2">
            {resource.title}
          </h3>

          {!compact && resource.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              {resource.description}
            </p>
          )}
        </div>
      </button>

      <ResourceDetailsDialog
        resource={resource}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onOpenReport={() => {
          setDetailsOpen(false);
          setReportOpen(true);
        }}
      />

      <ReportResourceDialog
        resource={resource}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </>
  );
});

function ResourceDetailsDialog({
  resource,
  open,
  onOpenChange,
  onOpenReport,
}: {
  resource: Resource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenReport: () => void;
}) {
  const formattedDate = resource.createdAt ? formatDate(resource.createdAt) : null;

  return (
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
            onClick={onOpenReport}
            className="focus-ring text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors flex items-center justify-center sm:justify-start gap-1.5 py-1 px-1 cursor-pointer"
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
      setError("Please select a report reason.");
      return;
    }
    if (reason === "Other" && !explanation.trim()) {
      setError("Please provide an explanation for 'Other'.");
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
            title: "Report submitted successfully.",
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
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-1.5 text-xs font-bold text-[hsl(var(--accent-foreground))] shadow-xs">
                Nexora
              </div>
              <TotalVisitsCounter />
            </div>
            <h1 className="display-font max-w-xl text-4xl font-bold leading-[1.05] tracking-[-.06em] sm:text-6xl">
               BITM resources.<br />All in one place.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">
              Notes, PYQs, and study materials.
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

function TotalVisitsCounter() {
  const { data, isError } = useGetTotalVisits();
  const recordVisit = useRecordVisit();

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !sessionStorage.getItem("nexora_visit_recorded")) {
        sessionStorage.setItem("nexora_visit_recorded", "1");
        recordVisit.mutate();
      }
    } catch {
      // Storage unavailable / blocked
    }
  }, [recordVisit]);

  if (isError || data?.totalVisits === undefined || data?.totalVisits === null) {
    return null;
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-[hsl(var(--muted-foreground))] shadow-xs transition-colors hover:border-[hsl(var(--secondary)/.5)]"
      data-testid="stat-total-visits"
    >
      <span aria-hidden="true">👀</span>
      <span className="font-bold text-[hsl(var(--foreground))]">{data.totalVisits.toLocaleString()}</span>
      <span>visits</span>
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
    <input value={current} onChange={(e) => { controlled ? onChange?.(e.target.value) : setLocal(e.target.value); }} className="input-style h-14 !pl-12 !pr-11 text-sm shadow-sm" placeholder="Search notes, papers, subjects..." data-testid="input-search" />
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
  if (branchLoading || !branch) return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12">
      <div className="mb-6 flex gap-1.5"><div className="h-4 w-24 animate-pulse rounded bg-[hsl(var(--muted))]" /></div>
      <section className="relative overflow-hidden rounded-3xl bg-[hsl(var(--primary)/.2)] p-6 sm:p-10 h-64 animate-pulse" />
      <div className="mt-10">
        <div className="h-6 w-48 animate-pulse rounded bg-[hsl(var(--muted))] mb-6" />
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" />)}
        </div>
      </div>
    </div>
  );

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
  if (subjectLoading || !subject) return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-7 sm:py-12">
      <div className="mb-6 flex gap-1.5"><div className="h-4 w-32 animate-pulse rounded bg-[hsl(var(--muted))]" /></div>
      <section className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.78)] p-6 sm:p-9">
        <div className="h-4 w-24 animate-pulse rounded bg-[hsl(var(--muted))] mb-3" />
        <div className="h-10 w-64 animate-pulse rounded bg-[hsl(var(--muted))] mb-4" />
        <div className="h-16 w-full max-w-xl animate-pulse rounded bg-[hsl(var(--muted))]" />
      </section>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-[hsl(var(--muted))]" />)}
      </div>
    </div>
  );

  return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-7 sm:py-12"><Breadcrumbs items={[
    { label: "Home", href: "/" },
    { label: branch?.shortName ?? "Branch", href: branch ? `/branch/${branch.id}` : undefined },
    { label: year?.name ?? "Year" },
    { label: semester?.name ?? "Semester" },
    { label: subject.name }
  ]} /><section className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.78)] p-6 sm:p-9"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="micro-label mb-3 text-[hsl(var(--accent-foreground))]">{branch?.shortName ?? "—"} • {year?.name ?? "—"} • {semester?.name ?? "—"}</p><h1 className="display-font text-4xl font-bold tracking-[-.05em] sm:text-5xl">{subject.name}</h1><p className="mt-4 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{subject.description}</p></div><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))]"><BookOpen size={25} /></span></div></section><div className="mt-10"><SectionHeading eyebrow={`${resources.length} resources`} title="Your subject shelf" action={<Link href="/contribute" className="focus-ring flex items-center gap-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold" data-testid="link-contribute-subject"><Plus size={14} /> Add one</Link>} />{resources.length ? <ResourceTypeGroups resources={resources} /> : <EmptyState title="This shelf is waiting for its first resource" body="If you have notes or a paper for this subject, you can be the person who starts it." action={<Link href="/contribute" className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-empty-subject-contribute"><Upload size={14} /> Contribute material</Link>} />}</div></div>;
}

function ContributePage() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ status: string; autoPublished?: boolean } | null>(null);
  
  const [contributionMode, setContributionMode] = useState<"resource" | "ia">("resource");

  const [branchId, setBranchId] = useState<number | undefined>(undefined);
  const [yearId, setYearId] = useState<number | undefined>(undefined);
  const [semesterId, setSemesterId] = useState<number | undefined>(undefined);
  const [subjectId, setSubjectId] = useState<number | undefined>(undefined);
  const [form, setForm] = useState({ resourceType: "Lecture notes" as ResourceType, title: "", description: "", googleDriveUrl: "", studentName: "", studentEmail: "" });
  
  const [iaForm, setIaForm] = useState({
    iaAcademicYear: "1st Year",
    iaSemester: "1st Semester • Odd",
    iaDepartment: "",
    iaType: "IA-1",
    title: "",
    googleDriveUrl: "",
    studentName: "",
    studentEmail: ""
  });

  const [error, setError] = useState("");
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const updateIa = (key: keyof typeof iaForm, value: string) => setIaForm((current) => ({ ...current, [key]: value }));

  const { data: branches = [] } = useListBranches();
  const { data: years = [] } = useListYears({ branchId: branchId as number }, qOpts(!!branchId));
  const { data: semesters = [] } = useListSemesters({ yearId: yearId as number }, qOpts(!!yearId));
  const { data: subjects = [] } = useListSubjects({ semesterId: semesterId as number }, qOpts(!!semesterId));
  const { data: iaDepartments = [] } = useListIaDepartments({ includeInactive: false });
  const createSubmission = useCreateSubmission();

  useEffect(() => { if (branches.length && branchId === undefined) setBranchId(branches[0]?.id); }, [branches, branchId]);
  useEffect(() => { if (years.length) setYearId((current) => current && years.some((y) => y.id === current) ? current : years[0]?.id); else setYearId(undefined); }, [years]);
  useEffect(() => { if (semesters.length) setSemesterId((current) => current && semesters.some((s) => s.id === current) ? current : semesters[0]?.id); else setSemesterId(undefined); }, [semesters]);
  useEffect(() => { if (subjects.length) setSubjectId((current) => current && subjects.some((s) => s.id === current) ? current : subjects[0]?.id); else setSubjectId(undefined); }, [subjects]);
  useEffect(() => { if (iaDepartments.length && !iaForm.iaDepartment) updateIa("iaDepartment", iaDepartments[0]?.name); }, [iaDepartments, iaForm.iaDepartment]);
  
  // Auto-generate title for IA
  useEffect(() => {
    if (contributionMode === "ia") {
      updateIa("title", `${iaForm.iaAcademicYear} • ${iaForm.iaSemester} • ${iaForm.iaDepartment} • ${iaForm.iaType}`);
    }
  }, [iaForm.iaAcademicYear, iaForm.iaSemester, iaForm.iaDepartment, iaForm.iaType, contributionMode]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createSubmission.isPending) return;
    
    if (contributionMode === "resource") {
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
        onSuccess: (data: Submission & { autoPublished?: boolean }) => {
          const isAuto = data.status === "approved" || Boolean(data.autoPublished);
          setSubmittedData({ status: data.status, autoPublished: isAuto });
          setSubmitted(true);
          setError("");
          if (isAuto) {
            toast({ title: "Resource published successfully!", description: "You can now find it in the resource library." });
          } else {
            toast({ title: "Resource submitted successfully!", description: "Your submission will appear after admin review." });
          }
        },
        onError: (err) => setError(getErrorMessage(err) || "Unable to submit the resource. Please try again."),
      });
    } else {
      // IA submission
      if (!iaForm.title.trim() || !iaForm.studentName.trim() || !iaForm.studentEmail.trim() || !iaForm.iaDepartment.trim()) {
        setError("Please fill in the required fields before sending.");
        return;
      }
      if (!iaForm.googleDriveUrl.trim() || !isValidGoogleDriveUrl(iaForm.googleDriveUrl)) {
        setError("Please enter a valid Google Drive link.");
        return;
      }
      createSubmission.mutate({ 
        data: { 
          resourceType: "Internal Assessment" as ResourceType,
          title: iaForm.title,
          description: "Internal Assessment submission",
          googleDriveUrl: iaForm.googleDriveUrl,
          studentName: iaForm.studentName,
          studentEmail: iaForm.studentEmail,
          iaAcademicYear: iaForm.iaAcademicYear,
          iaSemester: iaForm.iaSemester,
          iaDepartment: iaForm.iaDepartment,
          iaType: iaForm.iaType
        } 
      }, {
        onSuccess: (data: Submission) => {
          setSubmittedData({ status: data.status, autoPublished: false });
          setSubmitted(true);
          setError("");
          toast({ title: "IA paper submitted successfully!", description: "It will appear after admin review." });
        },
        onError: (err) => setError(getErrorMessage(err) || "Unable to submit the paper. Please try again."),
      });
    }
  };

  if (submitted) {
    const isAuto = submittedData?.autoPublished || submittedData?.status === "approved";
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-7 sm:py-20">
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-14 text-center sm:px-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
            <CheckCircle2 size={32} />
          </div>
          <p className="micro-label mt-6 text-[hsl(var(--accent-foreground))]">
            {isAuto ? "Published to library" : "In the review queue"}
          </p>
          <h1 className="display-font mt-2 text-3xl font-bold tracking-[-.05em] sm:text-4xl">
            {isAuto ? "Published successfully!" : "Submitted successfully!"}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            {isAuto
              ? "You can now find it in the resource library. Thank you for contributing to Nexora!"
              : "Your submission will appear after admin review. Our student editors will check the link and details before it joins Nexora. That keeps the Verified badge meaningful for everyone."}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/resources"
              className="focus-ring rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
              data-testid="link-confirmation-library"
            >
              Browse the library
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setSubmittedData(null);
                setForm({ ...form, title: "", description: "", googleDriveUrl: "" });
                setIaForm({ ...iaForm, title: "", googleDriveUrl: "" });
                setError("");
              }}
              className="focus-ring rounded-xl border border-[hsl(var(--border))] px-5 py-3 text-sm font-bold"
              data-testid="button-submit-another"
            >
              Share another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-7 sm:py-12"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contribute" }]} />
    <div className="mb-8 max-w-2xl"><p className="micro-label mb-2 text-[hsl(var(--accent-foreground))]">Give back a little</p><h1 className="display-font text-4xl font-bold tracking-[-.05em] sm:text-5xl">Put a useful file<br />in the right hands.</h1>
      
      <div className="mt-8 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] p-6 sm:p-8">
        <h3 className="font-bold text-[hsl(var(--foreground))] mb-4">How it works</h3>
        <ol className="space-y-3 text-sm text-[hsl(var(--muted-foreground))]">
          <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary)/.2)] text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">1</span><span>Upload your notes, PYQs, or manuals to your Google Drive.</span></li>
          <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary)/.2)] text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">2</span><span>Make sure the link sharing is set to "Anyone with the link".</span></li>
          <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary)/.2)] text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">3</span><span>Paste the Google Drive link in the form below.</span></li>
          <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary)/.2)] text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">4</span><span>Select the correct branch, year, semester, and subject.</span></li>
          <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary)/.2)] text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">5</span><span>Submit your contribution for review.</span></li>
          <li className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--primary)/.2)] text-[10px] font-bold text-[hsl(var(--primary))]">6</span><span className="font-semibold text-[hsl(var(--foreground))]">Approved resources appear in Nexora for everyone.</span></li>
        </ol>
      </div>
    </div>
    
    <div className="mb-6 flex gap-4">
      <button 
        type="button" 
        onClick={() => setContributionMode("resource")} 
        className={`focus-ring px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${contributionMode === "resource" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "bg-[hsl(var(--secondary)/.15)] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary)/.3)]"}`}
      >
        Resource
      </button>
      <button 
        type="button" 
        onClick={() => setContributionMode("ia")} 
        className={`focus-ring px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${contributionMode === "ia" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "bg-[hsl(var(--secondary)/.15)] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary)/.3)]"}`}
      >
        Internal Assessment Paper
      </button>
    </div>

    <form onSubmit={submit} className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.78)] p-5 sm:p-8">
      {contributionMode === "resource" ? (
        <>
          <FormSection title="Where does it belong?">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Branch" required><select value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value))} className="input-style">{branches.map((item) => <option key={item.id} value={item.id}>{item.shortName} — {item.name}</option>)}</select></Field>
              <Field label="Subject" required><select value={subjectId ?? ""} onChange={(e) => setSubjectId(Number(e.target.value))} className="input-style">{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Year" required><select value={yearId ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className="input-style">{years.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Semester" required><select value={semesterId ?? ""} onChange={(e) => setSemesterId(Number(e.target.value))} className="input-style">{semesters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            </div>
          </FormSection>
          <FormSection title="Tell us about it">
            <div className="grid gap-4">
              <Field label="Resource type" required><select value={form.resourceType} onChange={(e) => update("resourceType", e.target.value)} className="input-style">{resourceTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Title" required><input value={form.title} onChange={(e) => update("title", e.target.value)} className="input-style" placeholder="e.g. Data Structures revision notes" /></Field>
              <Field label="Short description"><textarea value={form.description} onChange={(e) => update("description", e.target.value)} className="input-style min-h-24 resize-y" placeholder="What will a student find inside?" /></Field>
              <Field label="Google Drive link" required hint={`${googleDriveUrlHint} Also make sure link access is set to "Anyone with the link".`}><div className="relative"><Link2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={16} /><input value={form.googleDriveUrl} onChange={(e) => update("googleDriveUrl", e.target.value)} className="input-style pl-11" placeholder="https://drive.google.com/..." /></div></Field>
            </div>
          </FormSection>
          <FormSection title="A little about you">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" required><input value={form.studentName} onChange={(e) => update("studentName", e.target.value)} className="input-style" placeholder="How should we credit you?" /></Field>
              <Field label="College email" required><input type="email" value={form.studentEmail} onChange={(e) => update("studentEmail", e.target.value)} className="input-style" placeholder="you@college.edu" /></Field>
            </div>
          </FormSection>
        </>
      ) : (
        <>
          <FormSection title="IA Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Year" required>
                <select value={iaForm.iaAcademicYear} onChange={(e) => updateIa("iaAcademicYear", e.target.value)} className="input-style">
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                </select>
              </Field>
              <Field label="Semester" required>
                <select value={iaForm.iaSemester} onChange={(e) => updateIa("iaSemester", e.target.value)} className="input-style">
                  <option>1st Semester • Odd</option>
                  <option>2nd Semester • Even</option>
                  <option>3rd Semester</option>
                  <option>4th Semester</option>
                  <option>5th Semester</option>
                  <option>6th Semester</option>
                  <option>7th Semester</option>
                  <option>8th Semester</option>
                </select>
              </Field>
              <Field label="Department / Stream" required>
                <select value={iaForm.iaDepartment} onChange={(e) => updateIa("iaDepartment", e.target.value)} className="input-style">
                  {iaDepartments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="IA Type" required>
                <select value={iaForm.iaType} onChange={(e) => updateIa("iaType", e.target.value)} className="input-style">
                  <option>IA-1</option>
                  <option>IA-2</option>
                  <option>IA-3</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Title" required>
                <input value={iaForm.title} onChange={(e) => updateIa("title", e.target.value)} className="input-style" />
              </Field>
              <Field label="Google Drive link" required hint="Make sure your Google Drive file or folder is shared so students with the link can view it.">
                <div className="relative"><Link2 className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={16} /><input value={iaForm.googleDriveUrl} onChange={(e) => updateIa("googleDriveUrl", e.target.value)} className="input-style pl-11" placeholder="https://drive.google.com/..." /></div>
              </Field>
            </div>
          </FormSection>
          <FormSection title="A little about you">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" required><input value={iaForm.studentName} onChange={(e) => updateIa("studentName", e.target.value)} className="input-style" placeholder="How should we credit you?" /></Field>
              <Field label="College email" required><input type="email" value={iaForm.studentEmail} onChange={(e) => updateIa("studentEmail", e.target.value)} className="input-style" placeholder="you@college.edu" /></Field>
            </div>
          </FormSection>
        </>
      )}

      {error && <div className="mb-4 mt-6 flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]" role="alert"><CircleAlert size={15} className="mt-0.5 shrink-0" />{error}</div>}
      <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-[hsl(var(--border))] pt-5 sm:flex-row sm:items-center">
        <p className="text-xs leading-5 text-[hsl(var(--muted-foreground))]">Submissions are checked by the Nexora student team.</p>
        <button type="submit" disabled={createSubmission.isPending} className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-60 w-full sm:w-auto">
          {createSubmission.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send for review
        </button>
      </div>
    </form>
  </div>;
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
    { href: "/admin/pyqs", label: "PYQs", testId: "link-admin-pyqs" },
    { href: "/admin/quick-links", label: "Quick Links", testId: "link-admin-quick-links" },
    { href: "/admin/reports", label: "Reports", testId: "link-admin-reports" },
    { href: "/admin/feedback", label: "Feedback", testId: "link-admin-feedback" },
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
  const qpsQuery = useListSemesterQps({ isPublished: "all" });
  const iaPapersQuery = useListIaPapers({ isPublished: "all" });

  const isLoading =
    branchesQuery.isLoading ||
    yearsQuery.isLoading ||
    semestersQuery.isLoading ||
    subjectsQuery.isLoading ||
    resourcesQuery.isLoading ||
    submissionsQuery.isLoading ||
    reportsQuery.isLoading ||
    qpsQuery.isLoading ||
    iaPapersQuery.isLoading;

  const isError =
    branchesQuery.isError ||
    yearsQuery.isError ||
    semestersQuery.isError ||
    subjectsQuery.isError ||
    resourcesQuery.isError ||
    submissionsQuery.isError ||
    reportsQuery.isError ||
    qpsQuery.isError ||
    iaPapersQuery.isError;

  const handleRetry = () => {
    branchesQuery.refetch();
    yearsQuery.refetch();
    semestersQuery.refetch();
    subjectsQuery.refetch();
    resourcesQuery.refetch();
    submissionsQuery.refetch();
    reportsQuery.refetch();
    qpsQuery.refetch();
    iaPapersQuery.refetch();
  };

  const branches = branchesQuery.data ?? [];
  const years = yearsQuery.data ?? [];
  const semesters = semestersQuery.data ?? [];
  const subjects = subjectsQuery.data ?? [];
  const resources = resourcesQuery.data ?? [];
  const submissions = submissionsQuery.data ?? [];
  const reports = (reportsQuery.data ?? []) as ReportItem[];
  const qps = qpsQuery.data ?? [];
  const iaPapers = iaPapersQuery.data ?? [];

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
  const totalPyqs = qps.length + iaPapers.length;
  const publishedPyqs = qps.filter((q) => q.isPublished).length + iaPapers.filter((p) => p.isPublished).length;

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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
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
                icon={FileArchive}
                label="PYQs"
                value={totalPyqs}
                detail={qpsQuery.isError || iaPapersQuery.isError ? "Error loading" : `${publishedPyqs} published (${qps.length} sem / ${iaPapers.length} IA)`}
                isError={qpsQuery.isError || iaPapersQuery.isError}
                testId="metric-pyqs"
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
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
                href="/admin/pyqs"
                className="focus-ring card-lift group flex flex-col justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 transition-colors hover:border-[hsl(var(--secondary))]"
                data-testid="quick-action-manage-pyqs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--primary))] group-hover:bg-[hsl(var(--secondary)/.2)]">
                    <GraduationCap size={18} />
                  </div>
                  <ArrowRight size={14} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-4">
                  <p className="text-xs font-bold text-[hsl(var(--foreground))]">Manage PYQs</p>
                  <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">Question paper archives</p>
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

function AdminSubmissionApprovalSetting() {
  const { data: setting, isLoading } = useGetSubmissionMode();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();
  const updateMode = useUpdateSubmissionMode({
    onSuccess: (data) => {
      queryClient.setQueryData(getSubmissionModeQueryKey(), data);
      queryClient.invalidateQueries({ queryKey: getSubmissionModeQueryKey() });
      toast({
        title: "Submission approval mode updated",
        description:
          data.mode === "auto_publish"
            ? "New valid submissions will now publish automatically."
            : "New submissions will now require manual admin approval.",
      });
      setConfirmOpen(false);
    },
    onError: (err) => {
      toast({
        title: "Failed to update mode",
        description: getErrorMessage(err) || "An error occurred.",
        variant: "destructive",
      });
    },
  });

  const currentMode: SubmissionApprovalMode = setting?.mode ?? "approval_required";
  const isAutoPublish = currentMode === "auto_publish";

  const handleToggle = () => {
    if (updateMode.isPending) return;
    if (!isAutoPublish) {
      setConfirmOpen(true);
    } else {
      updateMode.mutate({ data: { mode: "approval_required" } });
    }
  };

  const handleConfirmEnableAuto = () => {
    updateMode.mutate({ data: { mode: "auto_publish" } });
  };

  return (
    <>
      <div
        className="mb-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.75)] p-4 sm:p-5 shadow-xs"
        data-testid="card-submission-approval-setting"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Submission Approval
              </span>
              {isLoading ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-2.5 py-0.5 text-xs font-bold text-[hsl(var(--muted-foreground))]">
                  <Loader2 size={12} className="animate-spin" /> Loading…
                </span>
              ) : isAutoPublish ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--accent))] px-2.5 py-0.5 text-xs font-bold text-[hsl(var(--accent-foreground))]"
                  data-testid="badge-mode-auto-publish"
                >
                  ⚡ Auto Publish
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--secondary)/.25)] px-2.5 py-0.5 text-xs font-bold text-[hsl(var(--secondary-foreground))]"
                  data-testid="badge-mode-approval-required"
                >
                  🔒 Approval Required
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
              {isAutoPublish
                ? "New submissions are published automatically."
                : "New submissions require admin approval."}
            </p>
            {setting?.updatedAt && (
              <p className="text-[11px] text-[hsl(var(--muted-foreground)/.8)]">
                Last updated {setting.updatedBy ? `by ${setting.updatedBy}` : ""} on{" "}
                {formatDate(setting.updatedAt)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isLoading || updateMode.isPending}
              onClick={handleToggle}
              className={`focus-ring inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all disabled:opacity-60 cursor-pointer ${
                isAutoPublish
                  ? "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.6)]"
                  : "border-[hsl(var(--accent-foreground)/.4)] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:opacity-90"
              }`}
              data-testid="button-toggle-approval-mode"
            >
              {updateMode.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isAutoPublish ? (
                <Lock size={14} />
              ) : (
                <Zap size={14} />
              )}
              {isAutoPublish ? "Switch to Approval Required" : "Switch to Auto Publish"}
            </button>
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md rounded-3xl" data-testid="dialog-confirm-auto-publish">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
              <Zap size={22} />
            </div>
            <DialogTitle className="text-center text-xl font-bold tracking-[-.03em]">
              Enable automatic publishing?
            </DialogTitle>
            <DialogDescription className="text-center text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
              New valid submissions will be published without manual admin review.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={updateMode.isPending}
              className="focus-ring w-full sm:w-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2.5 text-xs font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.6)]"
              data-testid="button-cancel-auto-publish"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmEnableAuto}
              disabled={updateMode.isPending}
              className="focus-ring inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-60"
              data-testid="button-confirm-auto-publish"
            >
              {updateMode.isPending && <Loader2 size={14} className="animate-spin" />}
              Enable Auto Publish
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
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
  return (
    <AdminLayout>
      <AdminSubmissionApprovalSetting />
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Submission queue</h2>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Check context and link access before approving.</p>
        </div>
        <div className="flex rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1">
          <button type="button" onClick={() => setFilter("pending")} className={`focus-ring rounded-lg px-3 py-2 text-xs font-bold ${filter === "pending" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : ""}`} data-testid="button-filter-pending">Pending</button>
          <button type="button" onClick={() => setFilter("all")} className={`focus-ring rounded-lg px-3 py-2 text-xs font-bold ${filter === "all" ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : ""}`} data-testid="button-filter-all-submissions">All</button>
        </div>
      </div>
      {isLoading ? (
        <Loader2 className="mx-auto my-10 animate-spin text-[hsl(var(--muted-foreground))]" size={24} />
      ) : shown.length ? (
        <div className="space-y-3">
          {shown.map((submission) => (
            <SubmissionRow
              key={submission.id}
              submission={submission}
              actions={submission.status === "pending"}
              busy={busyId === submission.id}
              isApproving={isApproving(submission.id)}
              isRejecting={isRejecting(submission.id)}
              onApprove={() => approve.mutate({ id: submission.id })}
              onReject={() => {
                const reason = window.prompt("Reason for rejecting this submission (optional):");
                if (reason === null) return;
                reject.mutate({ id: submission.id, data: { rejectionReason: reason || undefined } });
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="The queue is clear" body="No submissions are waiting for a review right now. A rare, satisfying moment." />
      )}
    </AdminLayout>
  );
}


function AdminFeedback() {
  const [filterStatus, setFilterStatus] = useState<"pending" | "reviewed" | "archived" | "all">("pending");
  const [filterCategory, setFilterCategory] = useState<"all" | "improvement" | "bug" | "content" | "other">("all");
  const { data: feedbackList = [], isLoading } = useListFeedback();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListFeedbackQueryKey() });
  const updateFeedback = useUpdateFeedback();
  const deleteFeedback = useDeleteFeedback();

  const handleUpdateStatus = (id: number, status: "pending" | "reviewed" | "archived") => {
    updateFeedback.mutate({ id, data: { status } }, {
      onSuccess: () => {
        invalidate();
        toast({ title: `Feedback marked as ${status}` });
      },
      onError: (err: any) => {
        toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("Are you sure you want to delete this feedback item?")) return;
    deleteFeedback.mutate({ id }, {
      onSuccess: () => {
        invalidate();
        toast({ title: "Feedback deleted" });
      },
      onError: (err: any) => {
        toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
      }
    });
  };

  const filtered = (feedbackList as Feedback[]).filter((item) => {
    const matchStatus = filterStatus === "all" || item.status === filterStatus;
    const matchCategory = filterCategory === "all" || item.category === filterCategory;
    return matchStatus && matchCategory;
  });

  const counts = useMemo(() => {
    const list = feedbackList as Feedback[];
    return {
      all: list.length,
      pending: list.filter((i) => i.status === "pending").length,
      reviewed: list.filter((i) => i.status === "reviewed").length,
      archived: list.filter((i) => i.status === "archived").length,
      bugs: list.filter((i) => i.category === "bug").length,
      improvements: list.filter((i) => i.category === "improvement").length,
    };
  }, [feedbackList]);

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">User Feedback & Bug Reports</h2>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Review feature suggestions, bug reports, and feedback submitted by students.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1">
            {(["pending", "reviewed", "archived", "all"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                  filterStatus === s
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
                data-testid={`button-filter-feedback-${s}`}
              >
                {s} {s === "pending" && counts.pending > 0 ? `(${counts.pending})` : ""}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mr-1">Category:</span>
        {[
          { id: "all", label: "All Categories" },
          { id: "improvement", label: "💡 Suggestions" },
          { id: "bug", label: "🐛 Bugs" },
          { id: "content", label: "📚 Missing Content" },
          { id: "other", label: "💬 General" },
        ].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilterCategory(c.id as any)}
            className={`focus-ring rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
              filterCategory === c.id
                ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-xs"
                : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto my-12 animate-spin text-[hsl(var(--muted-foreground))]" size={28} />
      ) : filtered.length ? (
        <div className="space-y-3.5">
          {filtered.map((item) => {
            const isBug = item.category === "bug";
            const isImprovement = item.category === "improvement";
            const isContent = item.category === "content";

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] p-4 sm:p-5 transition-all shadow-xs"
                data-testid={`feedback-card-${item.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                          isBug
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            : isImprovement
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : isContent
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                        {isBug ? "🐛 Bug Report" : isImprovement ? "💡 Suggestion" : isContent ? "📚 Content Issue" : "💬 General Feedback"}
                      </span>

                      {item.status === "pending" ? (
                        <span className="rounded-full bg-[hsl(var(--secondary)/.25)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--secondary-foreground))]">
                          Pending
                        </span>
                      ) : item.status === "reviewed" ? (
                        <span className="rounded-full bg-[hsl(var(--accent))] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--accent-foreground))]">
                          Reviewed
                        </span>
                      ) : (
                        <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                          Archived
                        </span>
                      )}

                      <span className="text-[11px] text-[hsl(var(--muted-foreground))] ml-auto sm:ml-0">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm leading-relaxed text-[hsl(var(--foreground))] whitespace-pre-wrap font-medium">
                      {item.message}
                    </p>

                    {(item.name || item.email || item.pageUrl) && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] pt-2 border-t border-[hsl(var(--border)/.5)]">
                        {item.name && (
                          <span className="font-semibold text-[hsl(var(--foreground))]">
                            By: {item.name}
                          </span>
                        )}
                        {item.email && (
                          <a
                            href={`mailto:${item.email}`}
                            className="font-semibold text-[hsl(var(--primary))] hover:underline flex items-center gap-1"
                          >
                            📧 {item.email}
                          </a>
                        )}
                        {item.pageUrl && (
                          <span className="text-[11px] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-md font-mono">
                            Page: {item.pageUrl}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[hsl(var(--border)/.5)]">
                    {item.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(item.id, "reviewed")}
                        disabled={updateFeedback.isPending}
                        className="focus-ring inline-flex items-center gap-1 rounded-xl bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs hover:bg-[hsl(var(--primary)/.9)] cursor-pointer"
                        data-testid={`button-feedback-review-${item.id}`}
                      >
                        <Check size={13} /> Mark Reviewed
                      </button>
                    )}
                    {item.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(item.id, "archived")}
                        disabled={updateFeedback.isPending}
                        className="focus-ring inline-flex items-center gap-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] cursor-pointer"
                      >
                        Archive
                      </button>
                    )}
                    {item.status === "archived" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(item.id, "pending")}
                        disabled={updateFeedback.isPending}
                        className="focus-ring inline-flex items-center gap-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] cursor-pointer"
                      >
                        Reopen
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deleteFeedback.isPending}
                      className="focus-ring inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)] cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--muted))] text-xl mb-3">
            💬
          </div>
          <h3 className="text-sm font-bold text-[hsl(var(--foreground))]">No feedback found</h3>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {filterStatus === "pending" ? "All user feedback has been reviewed!" : "No feedback items match the selected filter."}
          </p>
        </div>
      )}
    </AdminLayout>
  );
}

function QuickLinkEditorDialog({
  open,
  onOpenChange,
  initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ImportantLinkItem | null;
}) {
  const isEditing = Boolean(initialData);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("WhatsApp Groups");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createQuickLink = useCreateQuickLink();
  const updateQuickLink = useUpdateQuickLink();

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setUrl(initialData.url);
      const presetList = ["WhatsApp Groups", "Results", "Exams", "Notices", "Academic", "College", "VTU", "Other"];
      if (presetList.includes(initialData.category)) {
        setCategory(initialData.category);
        setCustomCategory("");
      } else {
        setCategory("Other");
        setCustomCategory(initialData.category);
      }
      setDescription(initialData.description || "");
      setDisplayOrder(String(initialData.displayOrder ?? 0));
      setIsActive(initialData.isActive);
    } else {
      setTitle("");
      setUrl("");
      setCategory("WhatsApp Groups");
      setCustomCategory("");
      setDescription("");
      setDisplayOrder("0");
      setIsActive(true);
    }
    setError(null);
  }, [initialData, open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    if (!url.trim()) {
      setError("Please enter a URL.");
      return;
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      setError("URL must start with http:// or https://");
      return;
    }

    const finalCategory = category === "Other" && customCategory.trim() ? customCategory.trim() : category;

    const payload = {
      title: title.trim(),
      url: trimmedUrl,
      category: finalCategory,
      description: description.trim() || null,
      displayOrder: Number(displayOrder) || 0,
      isActive,
    };

    if (isEditing && initialData) {
      updateQuickLink.mutate(
        { id: initialData.id, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Quick link updated successfully" });
            onOpenChange(false);
          },
          onError: (err: any) => {
            setError(err?.message || "Failed to update quick link.");
          },
        },
      );
    } else {
      createQuickLink.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "Quick link created successfully" });
            onOpenChange(false);
          },
          onError: (err: any) => {
            setError(err?.message || "Failed to create quick link.");
          },
        },
      );
    }
  };

  const isPending = createQuickLink.isPending || updateQuickLink.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-7">
        <DialogHeader>
          <DialogTitle className="display-font text-2xl font-bold tracking-tight">
            {isEditing ? "Edit Quick Link" : "Add Quick Link"}
          </DialogTitle>
          <DialogDescription className="text-xs text-[hsl(var(--muted-foreground))]">
            {isEditing ? "Update link details and visibility." : "Add a new portal, group, or shortcut for students."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">
              Title <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2026 Batch WhatsApp Group"
              className="input-style h-10 w-full text-xs sm:text-sm"
              data-testid="input-quick-link-title"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">
                Category <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-style h-10 w-full text-xs"
                data-testid="select-quick-link-category"
              >
                {["WhatsApp Groups", "Results", "Exams", "Notices", "Academic", "College", "VTU", "Other"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">
                Display Order
              </label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="0"
                className="input-style h-10 w-full text-xs"
                data-testid="input-quick-link-order"
              />
            </div>
          </div>

          {category === "Other" && (
            <div>
              <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">
                Custom Category Name
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Library Portal"
                className="input-style h-10 w-full text-xs"
                data-testid="input-quick-link-custom-category"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">
              Destination URL <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="input-style h-10 w-full text-xs sm:text-sm"
              data-testid="input-quick-link-url"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[hsl(var(--foreground))]">
              Short Description <span className="text-[10px] font-normal text-[hsl(var(--muted-foreground))]">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Connect with classmates, share announcements..."
              className="input-style w-full text-xs py-2 px-3 resize-none"
              data-testid="textarea-quick-link-description"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="quick-link-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] cursor-pointer"
              data-testid="checkbox-quick-link-active"
            />
            <label htmlFor="quick-link-active" className="text-xs font-bold text-[hsl(var(--foreground))] cursor-pointer">
              Active (visible to students)
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]">
              <CircleAlert size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <DialogClose asChild>
              <button
                type="button"
                className="focus-ring inline-flex h-10 items-center justify-center rounded-xl border border-[hsl(var(--border))] px-4 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={isPending}
              className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-all hover:bg-[hsl(var(--primary)/.9)] disabled:opacity-50"
              data-testid="button-save-quick-link"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Create Link"}</span>
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminQuickLinks() {
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ImportantLinkItem | null>(null);

  const { data: links = [], isLoading } = useListQuickLinks({ isActive: "all" });
  const toggleStatus = useToggleQuickLinkStatus();
  const deleteQuickLink = useDeleteQuickLink();

  const handleToggle = (link: ImportantLinkItem) => {
    toggleStatus.mutate(
      { id: link.id, isActive: !link.isActive },
      {
        onSuccess: () => {
          toast({ title: `Link ${!link.isActive ? "activated" : "disabled"}` });
        },
        onError: (err: any) => {
          toast({ title: "Failed to update status", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  const handleDelete = (link: ImportantLinkItem) => {
    if (!window.confirm(`Are you sure you want to delete "${link.title}"?`)) return;
    deleteQuickLink.mutate(
      { id: link.id },
      {
        onSuccess: () => {
          toast({ title: "Quick link deleted" });
        },
        onError: (err: any) => {
          toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
        },
      },
    );
  };

  const filtered = useMemo(() => {
    return links.filter((item) => {
      const matchCat = filterCategory === "All" || item.category === filterCategory;
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && item.isActive) ||
        (filterStatus === "inactive" && !item.isActive);
      const matchSearch =
        !search.trim() ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.url.toLowerCase().includes(search.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchStatus && matchSearch;
    });
  }, [links, filterCategory, filterStatus, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[hsl(var(--foreground))]">
            Quick Links
          </h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Manage external portals, WhatsApp groups, VTU result links, and exam shortcuts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setEditorOpen(true);
          }}
          className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-all hover:bg-[hsl(var(--primary)/.9)] cursor-pointer"
          data-testid="button-add-quick-link"
        >
          <Plus size={15} /> Add Quick Link
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={14} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search links..."
            className="input-style h-9 w-full !pl-9 pr-3 text-xs"
            data-testid="input-admin-links-search"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input-style h-9 text-xs"
          data-testid="select-admin-links-cat"
        >
          <option value="All">All Categories</option>
          {["WhatsApp Groups", "Results", "Exams", "Notices", "Academic", "College", "VTU", "Other"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-style h-9 text-xs"
          data-testid="select-admin-links-status"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>

      {/* Table / List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.5)]" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.5)] font-bold text-[hsl(var(--muted-foreground))]">
                <tr>
                  <th className="px-4 py-3">Title & Details</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Order</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border)/.5)]">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[hsl(var(--muted)/.3)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-[hsl(var(--foreground))]">{item.title}</div>
                      {item.description && (
                        <div className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-1 mt-0.5">
                          {item.description}
                        </div>
                      )}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-[hsl(var(--primary))] hover:underline mt-1 truncate max-w-xs"
                      >
                        <span>{item.url}</span>
                        <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex rounded-md bg-[hsl(var(--muted))] px-2 py-0.5 text-[11px] font-bold text-[hsl(var(--foreground))]">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap text-xs font-mono text-[hsl(var(--muted-foreground))]">
                      {item.displayOrder}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        disabled={toggleStatus.isPending}
                        className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-colors ${
                          item.isActive
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                            : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.8)]"
                        }`}
                        data-testid={`button-toggle-status-${item.id}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${item.isActive ? "bg-emerald-500" : "bg-zinc-400"}`} />
                        <span>{item.isActive ? "Active" : "Inactive"}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setEditorOpen(true);
                          }}
                          className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] cursor-pointer"
                          title="Edit link"
                          data-testid={`button-edit-link-${item.id}`}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={deleteQuickLink.isPending}
                          className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.1)] cursor-pointer"
                          title="Delete link"
                          data-testid={`button-delete-link-${item.id}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] p-8 text-center">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">No quick links found.</p>
        </div>
      )}

      <QuickLinkEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initialData={editingItem}
      />
    </div>
  );
}

function AdminReports() {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const { data: reports = [], isLoading } = useListReports();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
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
              className="input-style h-10 w-full !pl-10 !pr-9 text-xs"
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
            {templates.map((tpl) => {
              const tplSubjects = Array.isArray(tpl.subjects) ? tpl.subjects : [];
              const subjectCount = typeof tpl.subjectCount === "number" ? tpl.subjectCount : tplSubjects.length;

              return (
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
                        {subjectCount} {subjectCount === 1 ? "subject" : "subjects"}
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

                    {tplSubjects.length > 0 ? (
                      <div className="mt-4 space-y-1.5 border-t border-[hsl(var(--border)/.6)] pt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                          Subjects blueprint:
                        </p>
                        <ul className="space-y-1 text-xs text-[hsl(var(--foreground))]">
                          {tplSubjects.slice(0, 4).map((s, idx) => (
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
                          {tplSubjects.length > 4 && (
                            <li className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                              + {tplSubjects.length - 4} more subjects
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
              );
            })}
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
    semesterId && (existingTemplates ?? []).some((t) => t.semesterId === semesterId),
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

  const subjectsList = Array.isArray(template?.subjects) ? template.subjects : [];

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
          displayOrder: subjectsList.length,
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
    const sorted = [...subjectsList].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
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

  const sortedSubjects = [...subjectsList].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

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
  const subjectsList = Array.isArray(template?.subjects) ? template.subjects : [];
  const sortedSubjects = [...subjectsList].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

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

const POPULAR_YEARS = ["All", "2026", "2025", "2024", "2023", "2022 & Model Papers"];
const POPULAR_SEMESTERS = [
  "All",
  "8th Semester",
  "7th Semester",
  "6th Semester",
  "5th Semester",
  "4th Semester",
  "3rd Semester",
  "2nd Semester",
  "1st Semester",
  "Model Papers",
];

const IA_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
const IA_TYPES = ["IA-1", "IA-2", "IA-3", "Other"] as const;
const IA_YEAR_SEMESTERS: Record<string, string[]> = {
  "1st Year": ["1st Semester", "2nd Semester"],
  "2nd Year": ["3rd Semester", "4th Semester"],
  "3rd Year": ["5th Semester", "6th Semester"],
  "4th Year": ["7th Semester", "8th Semester"],
};

function getIaSemesterLabel(sem: string): string {
  const s = sem.trim();
  if (s === "1st Semester" || s === "1st Sem" || s.toLowerCase() === "1st semester") {
    return "1st Semester • Odd";
  }
  if (s === "2nd Semester" || s === "2nd Sem" || s.toLowerCase() === "2nd semester") {
    return "2nd Semester • Even";
  }
  return s;
}

function getQuickLinkCategoryMeta(category: string) {
  switch (category) {
    case "WhatsApp Groups":
      return {
        label: "WhatsApp",
        icon: MessageSquare,
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        btnClass: "hover:border-emerald-500/40",
      };
    case "Results":
      return {
        label: "Results",
        icon: BadgeCheck,
        badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        btnClass: "hover:border-purple-500/40",
      };
    case "Exams":
      return {
        label: "Exams",
        icon: Calendar,
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        btnClass: "hover:border-amber-500/40",
      };
    case "Notices":
      return {
        label: "Notices",
        icon: Sparkles,
        badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        btnClass: "hover:border-blue-500/40",
      };
    case "Academic":
      return {
        label: "Academic",
        icon: BookOpen,
        badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
        btnClass: "hover:border-indigo-500/40",
      };
    case "College":
      return {
        label: "College",
        icon: GraduationCap,
        badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
        btnClass: "hover:border-cyan-500/40",
      };
    case "VTU":
      return {
        label: "VTU",
        icon: ShieldCheck,
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        btnClass: "hover:border-rose-500/40",
      };
    default:
      return {
        label: category || "Other",
        icon: Link2,
        badgeClass: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]",
        btnClass: "hover:border-[hsl(var(--border))]",
      };
  }
}

function QuickLinkCard({ link }: { link: ImportantLinkItem }) {
  const meta = getQuickLinkCategoryMeta(link.category);
  const Icon = meta.icon;

  let hostname = "";
  try {
    hostname = new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    hostname = link.url;
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card-lift focus-ring group relative flex flex-col justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 text-left transition-all hover:border-[hsl(var(--accent-foreground)/.3)] hover:shadow-md cursor-pointer"
      data-testid={`card-quick-link-${link.id}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold tracking-tight ${meta.badgeClass}`}
          >
            <Icon size={13} />
            <span>{link.category}</span>
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors group-hover:bg-[hsl(var(--primary))] group-hover:text-[hsl(var(--primary-foreground))]">
            <ExternalLink size={13} />
          </span>
        </div>

        <h3 className="mt-4 text-base font-bold tracking-tight text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--accent-foreground))] transition-colors line-clamp-2">
          {link.title}
        </h3>

        {link.description && (
          <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))] line-clamp-2">
            {link.description}
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--border)/.5)] pt-3.5 text-xs">
        <span className="font-mono text-[11px] text-[hsl(var(--muted-foreground))] truncate max-w-[170px]">
          {hostname}
        </span>
        <span className="inline-flex items-center gap-1 font-bold text-[hsl(var(--primary))] group-hover:translate-x-0.5 transition-transform text-xs">
          <span>Open Link</span>
          <ArrowRight size={13} />
        </span>
      </div>
    </a>
  );
}

function QuickLinksPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const { data: links = [], isLoading } = useListQuickLinks();

  const filteredLinks = useMemo(() => {
    return links.filter((link) => {
      const matchCat = selectedCategory === "All" || link.category === selectedCategory;
      const matchSearch =
        !search.trim() ||
        link.title.toLowerCase().includes(search.toLowerCase()) ||
        (link.description && link.description.toLowerCase().includes(search.toLowerCase())) ||
        link.category.toLowerCase().includes(search.toLowerCase()) ||
        link.url.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [links, selectedCategory, search]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: links.length };
    for (const link of links) {
      counts[link.category] = (counts[link.category] || 0) + 1;
    }
    return counts;
  }, [links]);

  return (
    <div className="hero-wash min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Quick Links" }]} />

        {/* Header Hero */}
        <section className="soft-grid relative overflow-hidden rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-5 py-8 sm:px-10 sm:py-12 fade-up">
          <div className="relative max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-1.5 text-xs font-bold text-[hsl(var(--accent-foreground))] shadow-xs">
              <Link2 size={14} /> Official Portals & Shortcuts
            </div>
            <h1 className="display-font text-3xl font-bold tracking-[-.05em] sm:text-5xl">
              Quick Links
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))] sm:text-base">
              Access WhatsApp groups, VTU result portals, exam schedules, and essential college announcements all in one direct place.
            </p>
          </div>
          <div className="absolute -right-8 -top-8 hidden h-56 w-56 rounded-full border-[18px] border-[hsl(var(--secondary)/.2)] sm:block" />
        </section>

        {/* Search & Category Filter Bar */}
        <section className="mt-8 space-y-4 fade-up fade-up-delay-1">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={16} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search links, portals, WhatsApp groups..."
              className="input-style h-11 w-full !pl-11 pr-4 text-xs sm:text-sm"
              data-testid="input-quick-links-search"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {["All", "WhatsApp Groups", "Results", "Exams", "Notices", "Academic", "College", "VTU", "Other"].map((cat) => {
              const count = categoryCounts[cat] || 0;
              if (cat !== "All" && count === 0) return null;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`focus-ring inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--accent-foreground)/.4)] hover:text-[hsl(var(--foreground))]"
                  }`}
                  data-testid={`button-cat-${cat.toLowerCase().replaceAll(" ", "-")}`}
                >
                  <span>{cat}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      isSelected
                        ? "bg-[hsl(var(--primary-foreground)/.2)] text-[hsl(var(--primary-foreground))]"
                        : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Links Grid */}
        <section className="mt-8 pb-16 fade-up fade-up-delay-2">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.5)] p-5"
                />
              ))}
            </div>
          ) : filteredLinks.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLinks.map((link) => (
                <QuickLinkCard key={link.id} link={link} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.4)] p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                <Link2 size={26} />
              </div>
              <h3 className="mt-4 text-base font-bold text-[hsl(var(--foreground))]">
                No quick links available yet.
              </h3>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
                {search.trim() || selectedCategory !== "All"
                  ? "No links match your current filter criteria. Try clearing search or selecting All."
                  : "Important portals and groups will be added here by administrators soon."}
              </p>
              {(search.trim() || selectedCategory !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("All");
                    setSearch("");
                  }}
                  className="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-xs font-bold hover:bg-[hsl(var(--muted))] cursor-pointer"
                >
                  <RotateCcw size={13} /> Reset Filters
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PyqsPage() {
  const [activeTab, setActiveTab] = useState<"semester" | "ia" | "ia_contributions">(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab") || sp.get("type");
      if (tabParam === "ia" || tabParam === "internal") return "ia";
    }
    return "semester";
  });

  const handleTabChange = (tab: "semester" | "ia" | "ia_contributions") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      sp.set("tab", tab);
      const qs = sp.toString() ? `?${sp.toString()}` : window.location.pathname;
      window.history.replaceState(null, "", qs);
    }
  };

  return (
    <div className="hero-wash min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-7 sm:py-12">
        {/* Header */}
        <div className="mb-8 fade-up">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold text-[hsl(var(--accent-foreground))] shadow-xs">
            <GraduationCap size={14} /> PYQs
          </div>
          <h1 className="display-font text-3xl font-bold tracking-[-.04em] sm:text-5xl">
            Previous Question Papers
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-[hsl(var(--muted-foreground))] sm:text-base leading-relaxed">
            Direct question paper bundles, semester examinations, and internal assessment papers organized for fast student access.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8 flex border-b border-[hsl(var(--border))] gap-2">
          <button
            type="button"
            onClick={() => handleTabChange("semester")}
            className={`focus-ring inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeTab === "semester"
                ? "border-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
            data-testid="tab-semester-qps"
          >
            <BookOpen size={16} /> Semester QPs
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("ia")}
            className={`focus-ring inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              activeTab === "ia"
                ? "border-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
            data-testid="tab-internal-assessment"
          >
            <Clock3 size={16} /> Internal Assessment
          </button>
        </div>

        {activeTab === "semester" ? <PyqsSemesterSection /> : <PyqsIaSection />}
      </div>
    </div>
  );
}

function PyqsSemesterSection() {
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("year") || "All";
    }
    return "All";
  });
  const [selectedSemester, setSelectedSemester] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("semester") || sp.get("sem") || "All";
    }
    return "All";
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("department") || sp.get("dept") || "All";
    }
    return "All";
  });
  const [search, setSearch] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("q") || sp.get("search") || "";
    }
    return "";
  });

  const { data: branches = [] } = useListBranches({ includeInactive: false });

  const { data: qps = [], isLoading, isError, refetch } = useListSemesterQps({
    examYear: selectedYear !== "All" ? selectedYear : undefined,
    semester: selectedSemester !== "All" ? selectedSemester : undefined,
    department: selectedDepartment !== "All" ? selectedDepartment : undefined,
    search: search.trim() || undefined,
  });

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    for (const qp of qps) {
      if (qp.examYear) set.add(qp.examYear);
    }
    for (const y of POPULAR_YEARS) {
      if (y !== "All") set.add(y);
    }
    return ["All", ...Array.from(set).sort((a, b) => b.localeCompare(a))];
  }, [qps]);

  const availableSemesters = useMemo(() => {
    const set = new Set<string>();
    for (const qp of qps) {
      if (qp.semester) set.add(qp.semester);
    }
    for (const s of POPULAR_SEMESTERS) {
      if (s !== "All") set.add(s);
    }
    const order = [
      "All",
      "8th Semester",
      "7th Semester",
      "6th Semester",
      "5th Semester",
      "4th Semester",
      "3rd Semester",
      "2nd Semester",
      "1st Semester",
      "1st & 2nd Semester",
      "Model Papers",
    ];
    return Array.from(set).sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });
  }, [qps]);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const b of branches) {
      if (b.name) set.add(b.name);
      if (b.shortName) set.add(b.shortName);
    }
    for (const qp of qps) {
      if (qp.department) set.add(qp.department);
    }
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [branches, qps]);

  const grouped = useMemo(() => {
    const map = new Map<string, { examYear: string; semester: string; items: SemesterQpItem[] }>();
    for (const item of qps) {
      const key = `${item.examYear}__${item.semester}`;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(key, { examYear: item.examYear, semester: item.semester, items: [item] });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const yearComp = b.examYear.localeCompare(a.examYear);
      if (yearComp !== 0) return yearComp;
      return a.semester.localeCompare(b.semester);
    });
  }, [qps]);

  const syncUrlParams = (year: string, sem: string, dept: string, qText: string) => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      sp.set("tab", "semester");
      if (year !== "All") sp.set("year", year); else sp.delete("year");
      if (sem !== "All") sp.set("semester", sem); else sp.delete("semester");
      if (dept !== "All") sp.set("department", dept); else sp.delete("department");
      if (qText.trim()) sp.set("q", qText.trim()); else sp.delete("q");
      const qs = sp.toString() ? `?${sp.toString()}` : window.location.pathname;
      window.history.replaceState(null, "", qs);
    }
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    syncUrlParams(year, selectedSemester, selectedDepartment, search);
  };

  const handleSemesterChange = (sem: string) => {
    setSelectedSemester(sem);
    syncUrlParams(selectedYear, sem, selectedDepartment, search);
  };

  const handleDepartmentChange = (dept: string) => {
    setSelectedDepartment(dept);
    syncUrlParams(selectedYear, selectedSemester, dept, search);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    syncUrlParams(selectedYear, selectedSemester, selectedDepartment, val);
  };

  const hasActiveFilters =
    selectedYear !== "All" ||
    selectedSemester !== "All" ||
    selectedDepartment !== "All" ||
    Boolean(search.trim());

  const resetFilters = () => {
    setSelectedYear("All");
    setSelectedSemester("All");
    setSelectedDepartment("All");
    setSearch("");
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams();
      sp.set("tab", "semester");
      window.history.replaceState(null, "", `?${sp.toString()}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search branch, year, or department..."
              className="input-style h-10 w-full !pl-11 pr-9 text-xs sm:text-sm"
              data-testid="input-search-qps"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="focus-ring absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="focus-ring inline-flex items-center gap-1.5 self-start rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.5)] transition-colors cursor-pointer"
              data-testid="button-reset-qp-filters"
            >
              <RotateCcw size={12} /> Reset filters
            </button>
          )}
        </div>

        {/* Filter Selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[hsl(var(--border)/.5)]">
          {/* Exam Year Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="select-exam-year-filter" className="text-xs font-bold text-[hsl(var(--muted-foreground))] shrink-0">
              Exam Year:
            </label>
            <select
              id="select-exam-year-filter"
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 text-xs sm:text-sm font-semibold rounded-xl bg-[hsl(var(--card))] cursor-pointer w-auto min-w-[110px]"
              data-testid="select-exam-year"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y === "All" ? "All Years" : y}</option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="select-semester-filter" className="text-xs font-bold text-[hsl(var(--muted-foreground))] shrink-0">
              Semester:
            </label>
            <select
              id="select-semester-filter"
              value={selectedSemester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 text-xs sm:text-sm font-semibold rounded-xl bg-[hsl(var(--card))] cursor-pointer w-auto min-w-[130px]"
              data-testid="select-semester"
            >
              {availableSemesters.map((s) => (
                <option key={s} value={s}>{s === "All" ? "All Semesters" : s}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="select-department-filter" className="text-xs font-bold text-[hsl(var(--muted-foreground))] shrink-0">
              Department:
            </label>
            <select
              id="select-department-filter"
              value={selectedDepartment}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 text-xs sm:text-sm font-semibold rounded-xl bg-[hsl(var(--card))] cursor-pointer w-auto max-w-[240px] truncate"
              data-testid="select-department"
            >
              {availableDepartments.map((d) => (
                <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content / Groups */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)]" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-6 text-center" role="alert">
          <CircleAlert size={24} className="mx-auto text-[hsl(var(--destructive))] mb-2" />
          <p className="text-sm font-bold text-[hsl(var(--destructive))]">Failed to load question papers.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--card))] px-4 py-2 text-xs font-bold text-[hsl(var(--destructive))]"
          >
            <RotateCcw size={12} /> Retry
          </button>
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 sm:p-12 text-center shadow-xs" data-testid="status-empty-qps">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] mb-3">
            <FileText size={24} />
          </div>
          <h3 className="display-font text-xl font-bold">No Semester QPs available for this selection.</h3>
          <p className="mt-1.5 text-xs sm:text-sm text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
            {hasActiveFilters
              ? "Try adjusting or clearing your filters to see available papers."
              : "No semester question papers have been published yet."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div
              key={`${group.examYear}__${group.semester}`}
              className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.75)] p-5 sm:p-6 shadow-xs fade-up"
              data-testid={`card-qp-group-${group.examYear.replace(/[\s&]+/g, "-")}-${group.semester.replace(/[\s&]+/g, "-")}`}
            >
              {/* Group Header */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[hsl(var(--border)/.6)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-[hsl(var(--secondary)/.4)] bg-[hsl(var(--secondary)/.15)] px-3 py-1 text-xs font-bold text-[hsl(var(--secondary-foreground))]">
                    {group.examYear}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                    {group.semester}
                  </span>
                </div>
                <span className="text-xs text-[hsl(var(--muted-foreground))] font-semibold">
                  {group.items.length} {group.items.length === 1 ? "stream" : "streams"}
                </span>
              </div>

              {/* Department Stream Tiles */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => {
                  const urlLower = item.downloadUrl.toLowerCase();
                  const rType = item.resourceType || (urlLower.endsWith(".pdf") ? "pdf" : urlLower.endsWith(".zip") ? "zip" : urlLower.includes("drive.google.com") ? "drive" : "link");

                  let buttonLabel = "Download ZIP";
                  let buttonIcon = <FileArchive size={13} />;
                  if (rType === "pdf") {
                    buttonLabel = "View PDF";
                    buttonIcon = <FileText size={13} />;
                  } else if (rType === "drive") {
                    buttonLabel = "Open Drive";
                    buttonIcon = <FolderOpen size={13} />;
                  } else if (rType === "link") {
                    buttonLabel = "Open Link";
                    buttonIcon = <ExternalLink size={13} />;
                  }

                  return (
                    <div
                      key={item.id}
                      className="card-lift flex flex-col justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs hover:border-[hsl(var(--secondary)/.6)] transition-all"
                      data-testid={`tile-qp-${item.id}`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-sm text-[hsl(var(--foreground))] line-clamp-2">
                            {item.department}
                          </span>
                          <span className={`shrink-0 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            rType === "pdf"
                              ? "bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]"
                              : rType === "drive"
                              ? "bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))]"
                              : rType === "link"
                              ? "bg-[hsl(var(--accent)/.2)] text-[hsl(var(--accent-foreground))]"
                              : "bg-[hsl(var(--secondary)/.18)] text-[hsl(var(--secondary-foreground))]"
                          }`}>
                            {rType === "pdf" ? <FileText size={10} /> : rType === "drive" ? <FolderOpen size={10} /> : rType === "link" ? <ExternalLink size={10} /> : <FileArchive size={10} />}
                            {rType}
                          </span>
                        </div>
                        {item.title && item.title !== group.items[0]?.title && (
                          <p className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-1">
                            {item.title}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-end pt-2 border-t border-[hsl(var(--border)/.4)]">
                        <a
                          href={item.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-3.5 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs hover:bg-[hsl(var(--primary)/.9)] transition-all cursor-pointer"
                          data-testid={`button-download-qp-${item.id}`}
                        >
                          {buttonIcon}
                          <span>{buttonLabel}</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PyqsIaSection() {
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("year") || "All";
    }
    return "All";
  });
  const [selectedSemester, setSelectedSemester] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("semester") || sp.get("sem") || "All";
    }
    return "All";
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("department") || sp.get("dept") || "All";
    }
    return "All";
  });
  const [selectedIaType, setSelectedIaType] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("iaType") || sp.get("type") || "All";
    }
    return "All";
  });
  const [search, setSearch] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      return sp.get("q") || sp.get("search") || "";
    }
    return "";
  });

  const { data: iaPapers = [], isLoading, isError, refetch } = useListIaPapers({
    academicYear: selectedYear !== "All" ? selectedYear : undefined,
    semester: selectedSemester !== "All" ? selectedSemester : undefined,
    department: selectedDepartment !== "All" ? selectedDepartment : undefined,
    iaType: selectedIaType !== "All" ? selectedIaType : undefined,
    search: search.trim() || undefined,
  });

  const { data: branches = [] } = useListBranches({ includeInactive: false });

  const syncUrlParams = (year: string, sem: string, dept: string, type: string, qText: string) => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      sp.set("tab", "ia");
      if (year !== "All") sp.set("year", year); else sp.delete("year");
      if (sem !== "All") sp.set("semester", sem); else sp.delete("semester");
      if (dept !== "All") sp.set("department", dept); else sp.delete("department");
      if (type !== "All") sp.set("iaType", type); else sp.delete("iaType");
      if (qText.trim()) sp.set("q", qText.trim()); else sp.delete("q");
      const qs = sp.toString() ? `?${sp.toString()}` : window.location.pathname;
      window.history.replaceState(null, "", qs);
    }
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    let nextSem = selectedSemester;
    if (year !== "All") {
      const allowed = IA_YEAR_SEMESTERS[year] ?? [];
      if (selectedSemester !== "All" && !allowed.includes(selectedSemester)) {
        nextSem = "All";
        setSelectedSemester("All");
      }
    }
    syncUrlParams(year, nextSem, selectedDepartment, selectedIaType, search);
  };

  const handleSemesterChange = (sem: string) => {
    setSelectedSemester(sem);
    syncUrlParams(selectedYear, sem, selectedDepartment, selectedIaType, search);
  };

  const handleDepartmentChange = (dept: string) => {
    setSelectedDepartment(dept);
    syncUrlParams(selectedYear, selectedSemester, dept, selectedIaType, search);
  };

  const handleIaTypeChange = (type: string) => {
    setSelectedIaType(type);
    syncUrlParams(selectedYear, selectedSemester, selectedDepartment, type, search);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    syncUrlParams(selectedYear, selectedSemester, selectedDepartment, selectedIaType, val);
  };

  const availableSemesters = useMemo(() => {
    if (selectedYear !== "All" && IA_YEAR_SEMESTERS[selectedYear]) {
      return ["All", ...IA_YEAR_SEMESTERS[selectedYear]];
    }
    return [
      "All",
      "1st Semester",
      "2nd Semester",
      "3rd Semester",
      "4th Semester",
      "5th Semester",
      "6th Semester",
      "7th Semester",
      "8th Semester",
    ];
  }, [selectedYear]);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const b of branches) {
      if (b.name) set.add(b.name);
      if (b.shortName) set.add(b.shortName);
    }
    for (const p of iaPapers) {
      if (p.department) set.add(p.department);
    }
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [branches, iaPapers]);

  const hasActiveFilters =
    selectedYear !== "All" ||
    selectedSemester !== "All" ||
    selectedDepartment !== "All" ||
    selectedIaType !== "All" ||
    Boolean(search.trim());

  const resetFilters = () => {
    setSelectedYear("All");
    setSelectedSemester("All");
    setSelectedDepartment("All");
    setSelectedIaType("All");
    setSearch("");
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams();
      sp.set("tab", "ia");
      window.history.replaceState(null, "", `?${sp.toString()}`);
    }
  };

  // Group papers by academicYear -> semester -> department
  const grouped = useMemo(() => {
    const map = new Map<string, { academicYear: string; semester: string; department: string; items: IaPaperItem[] }>();
    for (const item of iaPapers) {
      const key = `${item.academicYear}__${item.semester}__${item.department}`;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(key, {
          academicYear: item.academicYear,
          semester: item.semester,
          department: item.department,
          items: [item],
        });
      }
    }
    const yearOrder = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    const semOrder = [
      "1st Semester",
      "2nd Semester",
      "3rd Semester",
      "4th Semester",
      "5th Semester",
      "6th Semester",
      "7th Semester",
      "8th Semester",
    ];

    return Array.from(map.values()).sort((a, b) => {
      const yA = yearOrder.indexOf(a.academicYear);
      const yB = yearOrder.indexOf(b.academicYear);
      if (yA !== -1 && yB !== -1 && yA !== yB) return yA - yB;
      const sA = semOrder.indexOf(a.semester);
      const sB = semOrder.indexOf(b.semester);
      if (sA !== -1 && sB !== -1 && sA !== sB) return sA - sB;
      return a.department.localeCompare(b.department);
    });
  }, [iaPapers]);

  return (
    <div className="space-y-6">
      {/* Year Tabs Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleYearChange("All")}
          className={`focus-ring inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer border ${
            selectedYear === "All"
              ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs"
              : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.5)]"
          }`}
          data-testid="button-ia-year-all"
        >
          <Layers3 size={13} /> All Years
        </button>
        {IA_YEARS.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => handleYearChange(y)}
            className={`focus-ring inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer border ${
              selectedYear === y
                ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs"
                : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.5)]"
            }`}
            data-testid={`button-ia-year-${y.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by title, department, or IA type..."
              className="input-style h-10 w-full !pl-11 pr-9 text-xs sm:text-sm"
              data-testid="input-search-ia-papers"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="focus-ring absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="focus-ring inline-flex items-center gap-1.5 self-start rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.5)] transition-colors cursor-pointer"
              data-testid="button-reset-ia-filters"
            >
              <RotateCcw size={12} /> Reset filters
            </button>
          )}
        </div>

        {/* Filter Selectors */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[hsl(var(--border)/.5)]">
          {/* Semester Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="select-ia-semester-filter" className="text-xs font-bold text-[hsl(var(--muted-foreground))] shrink-0">
              Semester:
            </label>
            <select
              id="select-ia-semester-filter"
              value={selectedSemester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 text-xs sm:text-sm font-semibold rounded-xl bg-[hsl(var(--card))] cursor-pointer w-auto min-w-[130px]"
              data-testid="select-ia-semester"
            >
              {availableSemesters.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All Semesters" : getIaSemesterLabel(s)}
                </option>
              ))}
            </select>
          </div>

          {/* Department Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="select-ia-department-filter" className="text-xs font-bold text-[hsl(var(--muted-foreground))] shrink-0">
              Department:
            </label>
            <select
              id="select-ia-department-filter"
              value={selectedDepartment}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 text-xs sm:text-sm font-semibold rounded-xl bg-[hsl(var(--card))] cursor-pointer w-auto max-w-[240px] truncate"
              data-testid="select-ia-department"
            >
              {availableDepartments.map((d) => (
                <option key={d} value={d}>
                  {d === "All" ? "All Departments" : d}
                </option>
              ))}
            </select>
          </div>

          {/* IA Type Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="select-ia-type-filter" className="text-xs font-bold text-[hsl(var(--muted-foreground))] shrink-0">
              IA Type:
            </label>
            <select
              id="select-ia-type-filter"
              value={selectedIaType}
              onChange={(e) => handleIaTypeChange(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 text-xs sm:text-sm font-semibold rounded-xl bg-[hsl(var(--card))] cursor-pointer w-auto min-w-[110px]"
              data-testid="select-ia-type"
            >
              <option value="All">All Types</option>
              {IA_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)]" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-6 text-center" role="alert">
          <CircleAlert size={24} className="mx-auto text-[hsl(var(--destructive))] mb-2" />
          <p className="text-sm font-bold text-[hsl(var(--destructive))]">Failed to load Internal Assessment papers.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--card))] px-4 py-2 text-xs font-bold text-[hsl(var(--destructive))]"
          >
            <RotateCcw size={12} /> Retry
          </button>
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-[28px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 sm:p-12 text-center shadow-xs" data-testid="status-empty-ia-papers">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] mb-3">
            <Clock3 size={24} />
          </div>
          <h3 className="display-font text-xl font-bold">
            {hasActiveFilters ? "No IA papers available for this selection." : "No Internal Assessment papers available yet."}
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm text-[hsl(var(--muted-foreground))] max-w-sm mx-auto">
            {hasActiveFilters
              ? "Try adjusting or clearing your filters to view available IA papers."
              : "Internal assessment papers and question banks will appear here as soon as they are published."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-4 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div
              key={`${group.academicYear}__${group.semester}__${group.department}`}
              className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.75)] p-5 sm:p-6 shadow-xs fade-up"
              data-testid={`card-ia-group-${group.department.toLowerCase().replace(/[\s/]+/g, "-")}`}
            >
              {/* Group Header */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[hsl(var(--border)/.6)] pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))]">
                    {group.department}
                  </h3>
                  <p className="mt-0.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                    {group.academicYear} • {getIaSemesterLabel(group.semester)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-[hsl(var(--secondary)/.4)] bg-[hsl(var(--secondary)/.15)] px-3 py-1 text-xs font-bold text-[hsl(var(--secondary-foreground))]">
                    {group.academicYear}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                    {getIaSemesterLabel(group.semester)}
                  </span>
                </div>
              </div>

              {/* IA Paper Cards */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((item) => {
                  const iaType = item.iaType || "IA-1";
                  return (
                    <div
                      key={item.id}
                      className="card-lift flex flex-col justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-xs hover:border-[hsl(var(--primary)/.5)] transition-all"
                      data-testid={`tile-ia-${item.id}`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                              iaType === "IA-1"
                                ? "bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))]"
                                : iaType === "IA-2"
                                ? "bg-[hsl(var(--secondary)/.18)] text-[hsl(var(--secondary-foreground))]"
                                : iaType === "IA-3"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-[hsl(var(--accent)/.2)] text-[hsl(var(--accent-foreground))]"
                            }`}
                          >
                            {iaType}
                          </span>
                          <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                            Internal Assessment
                          </span>
                        </div>
                        {item.title ? (
                          <h4 className="font-bold text-sm text-[hsl(var(--foreground))] line-clamp-2">
                            {item.title}
                          </h4>
                        ) : (
                          <h4 className="font-bold text-sm text-[hsl(var(--foreground))] line-clamp-2">
                            {item.academicYear} • {getIaSemesterLabel(item.semester)} • {item.department} • {item.iaType}
                          </h4>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-end pt-2 border-t border-[hsl(var(--border)/.4)]">
                        <a
                          href={item.googleDriveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-3.5 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs hover:bg-[hsl(var(--primary)/.9)] transition-all cursor-pointer"
                          data-testid={`button-view-ia-paper-${item.id}`}
                        >
                          <FolderOpen size={13} />
                          <span>View Paper</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminPyqs() {
  const [activeTab, setActiveTab] = useState<"semester" | "ia" | "ia_contributions">(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab") || sp.get("type");
      if (tabParam === "ia" || tabParam === "internal") return "ia";
    }
    return "semester";
  });

  const handleTabChange = (tab: "semester" | "ia" | "ia_contributions") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      sp.set("tab", tab);
      const qs = sp.toString() ? `?${sp.toString()}` : window.location.pathname;
      window.history.replaceState(null, "", qs);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <div className="flex border-b border-[hsl(var(--border))] gap-2">
        <button
          type="button"
          onClick={() => handleTabChange("semester")}
          className={`focus-ring inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
            activeTab === "semester"
              ? "border-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
              : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          }`}
          data-testid="admin-tab-semester-qps"
        >
          <BookOpen size={16} /> Semester QPs
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("ia")}
          className={`focus-ring inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
            activeTab === "ia"
              ? "border-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"
              : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          }`}
          data-testid="admin-tab-internal-assessment"
        >
          <Clock3 size={16} /> Internal Assessment
        </button>
      </div>

      {activeTab === "semester" ? <AdminSemesterQpsSection /> : <AdminIaPapersSection />}
    </div>
  );
}


function DepartmentManagerDialog({
  open,
  onOpenChange,
  title,
  departments,
  createDepartment,
  updateDepartment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  departments: { id: number; name: string; isActive: boolean; }[];
  createDepartment: ReturnType<any>;
  updateDepartment: ReturnType<any>;
}) {
  const [newDeptName, setNewDeptName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    createDepartment.mutate(
      { data: { name: newDeptName.trim(), isActive: true } },
      {
        onSuccess: () => {
          toast({ title: "Department added" });
          setNewDeptName("");
        },
        onError: (err: any) => toast({ title: "Failed to add", description: err.message, variant: "destructive" }),
        onSettled: () => setIsSubmitting(false),
      }
    );
  };

  const toggleActive = (id: number, current: boolean) => {
    updateDepartment.mutate(
      { id, data: { isActive: !current } },
      {
        onSuccess: () => toast({ title: "Status updated" }),
        onError: (err: any) => toast({ title: "Failed to update", description: err.message, variant: "destructive" })
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 rounded-3xl bg-[hsl(var(--background))] border-[hsl(var(--border))]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-xs">
            Manage the list of departments available for assignment.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              placeholder="New department name (e.g. CSE)"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              className="input-style flex-1 h-9 text-xs"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting || !newDeptName.trim()}
              className="focus-ring h-9 rounded-xl bg-[hsl(var(--primary))] px-4 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs disabled:opacity-50"
            >
              Add
            </button>
          </form>

          <div className="border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card)/.5)] max-h-[300px] overflow-y-auto">
            {departments.length === 0 ? (
              <div className="p-4 text-center text-xs text-[hsl(var(--muted-foreground))]">No departments found.</div>
            ) : (
              <ul className="divide-y divide-[hsl(var(--border))]">
                {departments.map((d) => (
                  <li key={d.id} className="flex items-center justify-between p-3">
                    <span className={`text-sm font-bold ${!d.isActive ? 'text-[hsl(var(--muted-foreground))] line-through' : ''}`}>
                      {d.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleActive(d.id, d.isActive)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${d.isActive ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'}`}
                    >
                      {d.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


function AdminSemesterQpsSection() {
  const queryClient = useQueryClient();
  const [deptManagerOpen, setDeptManagerOpen] = useState(false);
  const { data: semQpDepts = [] } = useListSemesterQpDepartments({ includeInactive: true });
  const createSemQpDept = useCreateSemesterQpDepartment({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSemesterQpDepartmentsQueryKey() }) } });
  const updateSemQpDept = useUpdateSemesterQpDepartment({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSemesterQpDepartmentsQueryKey() }) } });

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<SemesterQpItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<SemesterQpItem | null>(null);

  const { data: qps = [], isLoading, isError, refetch } = useListSemesterQps({
    isPublished: "all",
  });
  const { data: branches = [] } = useListBranches({ includeInactive: false });

  const updateQp = useUpdateSemesterQp();

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    for (const qp of qps) {
      if (qp.examYear) set.add(qp.examYear);
    }
    for (const y of POPULAR_YEARS) {
      if (y !== "All") set.add(y);
    }
    return ["All", ...Array.from(set).sort((a, b) => b.localeCompare(a))];
  }, [qps]);

  const availableSemesters = useMemo(() => {
    const set = new Set<string>();
    for (const qp of qps) {
      if (qp.semester) set.add(qp.semester);
    }
    for (const s of POPULAR_SEMESTERS) {
      if (s !== "All") set.add(s);
    }
    const order = [
      "All",
      "8th Semester",
      "7th Semester",
      "6th Semester",
      "5th Semester",
      "4th Semester",
      "3rd Semester",
      "2nd Semester",
      "1st Semester",
      "Model Papers",
    ];
    return Array.from(set).sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });
  }, [qps]);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const b of branches) {
      if (b.name) set.add(b.name);
      if (b.shortName) set.add(b.shortName);
    }
    for (const qp of qps) {
      if (qp.department) set.add(qp.department);
    }
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [branches, qps]);

  const filteredQps = useMemo(() => {
    return qps.filter((qp) => {
      if (yearFilter !== "All" && qp.examYear !== yearFilter) return false;
      if (semesterFilter !== "All" && qp.semester !== semesterFilter) return false;
      if (departmentFilter !== "All" && qp.department !== departmentFilter) return false;
      if (statusFilter === "published" && !qp.isPublished) return false;
      if (statusFilter === "draft" && qp.isPublished) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const match =
          qp.department.toLowerCase().includes(q) ||
          qp.semester.toLowerCase().includes(q) ||
          qp.examYear.toLowerCase().includes(q) ||
          (qp.title && qp.title.toLowerCase().includes(q)) ||
          qp.downloadUrl.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [qps, yearFilter, semesterFilter, departmentFilter, statusFilter, search]);

  const handleTogglePublish = (item: SemesterQpItem) => {
    if (updateQp.isPending) return;
    setUpdatingId(item.id);
    updateQp.mutate(
      { id: item.id, data: { isPublished: !item.isPublished } },
      {
        onSuccess: () => {
          setUpdatingId(null);
          toast({
            title: item.isPublished ? "Paper unpublished" : "Paper published",
            description: `${item.department} (${item.semester}) is now ${item.isPublished ? "in draft" : "public"}.`,
          });
        },
        onError: (err) => {
          setUpdatingId(null);
          toast({
            title: "Error updating status",
            description: getErrorMessage(err),
            variant: "destructive",
          });
        },
      },
    );
  };

  const hasActiveFilters =
    yearFilter !== "All" || semesterFilter !== "All" || departmentFilter !== "All" || statusFilter !== "all" || Boolean(search.trim());

  const resetFilters = () => {
    setSearch("");
    setYearFilter("All");
    setSemesterFilter("All");
    setDepartmentFilter("All");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Semester Question Papers</h2>
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
            Manage question paper archives, department links, resource types, and publish states.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDeptManagerOpen(true)}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary)/.15)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--secondary-foreground))] transition-colors cursor-pointer w-fit"
          >
            Manage Departments
          </button>
          <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs hover:bg-[hsl(var(--primary)/.9)] transition-colors cursor-pointer w-fit"
          data-testid="button-add-semester-qp"
        >
          <Plus size={15} /> Add Semester QP
        </button>
        </div>
      </div>
      
      <DepartmentManagerDialog
        open={deptManagerOpen}
        onOpenChange={setDeptManagerOpen}
        title="Semester QP Departments"
        departments={semQpDepts}
        createDepartment={createSemQpDept}
        updateDepartment={updateSemQpDept}
      />

      {/* Filters Bar */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search papers..."
                className="input-style h-9 w-full !pl-9 pr-7 text-xs"
                data-testid="input-admin-search-qps"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 w-full text-xs font-semibold rounded-xl bg-[hsl(var(--card))]"
              data-testid="select-admin-year-filter"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y === "All" ? "All Years" : y}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 w-full text-xs font-semibold rounded-xl bg-[hsl(var(--card))]"
              data-testid="select-admin-semester-filter"
            >
              {availableSemesters.map((s) => (
                <option key={s} value={s}>{s === "All" ? "All Semesters" : s}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 w-full text-xs font-semibold rounded-xl bg-[hsl(var(--card))]"
              data-testid="select-admin-dept-filter"
            >
              {availableDepartments.map((d) => (
                <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "published" | "draft")}
              className="input-style h-9 !py-1.5 !px-3 w-full text-xs font-semibold rounded-xl bg-[hsl(var(--card))]"
              data-testid="select-admin-status-filter"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published only</option>
              <option value="draft">Drafts only</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-[hsl(var(--border)/.5)] text-xs text-[hsl(var(--muted-foreground))]">
            <span>Showing {filteredQps.length} of {qps.length} question papers</span>
            <button
              type="button"
              onClick={resetFilters}
              className="focus-ring inline-flex items-center gap-1 font-bold text-[hsl(var(--primary))] hover:underline cursor-pointer"
            >
              <RotateCcw size={11} /> Reset filters
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)]" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-6 text-center">
          <p className="text-xs font-bold text-[hsl(var(--destructive))]">Failed to load question papers.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="focus-ring mt-2 inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold"
          >
            <RotateCcw size={12} /> Retry
          </button>
        </div>
      ) : filteredQps.length === 0 ? (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center" data-testid="status-admin-empty-qps">
          <p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">No question papers found.</p>
          <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
            {hasActiveFilters ? "Try clearing or changing your filters." : "Add the first question paper using the button above."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-1.5 text-xs font-semibold"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredQps.map((item) => {
            const urlLower = item.downloadUrl.toLowerCase();
            const rType = item.resourceType || (urlLower.endsWith(".pdf") ? "pdf" : urlLower.endsWith(".zip") ? "zip" : urlLower.includes("drive.google.com") ? "drive" : "link");
            const isRowUpdating = updateQp.isPending && updatingId === item.id;

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3.5 shadow-xs hover:border-[hsl(var(--border)/.8)] transition-colors"
                data-testid={`row-admin-qp-${item.id}`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[hsl(var(--foreground))] truncate">
                      {item.department}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-[hsl(var(--secondary)/.15)] px-2 py-0.5 text-[11px] font-bold text-[hsl(var(--secondary-foreground))]">
                      {item.examYear}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-[hsl(var(--muted))] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                      {item.semester}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      rType === "pdf"
                        ? "bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]"
                        : rType === "drive"
                        ? "bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))]"
                        : rType === "link"
                        ? "bg-[hsl(var(--accent)/.2)] text-[hsl(var(--accent-foreground))]"
                        : "bg-[hsl(var(--secondary)/.18)] text-[hsl(var(--secondary-foreground))]"
                    }`}>
                      {rType === "pdf" ? <FileText size={10} /> : rType === "drive" ? <FolderOpen size={10} /> : rType === "link" ? <ExternalLink size={10} /> : <FileArchive size={10} />}
                      {rType}
                    </span>
                  </div>
                  {item.title && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                      {item.title}
                    </p>
                  )}
                  <div className="pt-0.5">
                    <a
                      href={item.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring inline-flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--accent-foreground))] hover:underline max-w-sm truncate"
                    >
                      <ExternalLink size={11} /> {item.downloadUrl}
                    </a>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    disabled={updateQp.isPending}
                    onClick={() => handleTogglePublish(item)}
                    className={`focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors disabled:opacity-50 ${
                      item.isPublished
                        ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                        : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                    }`}
                    data-testid={`button-toggle-qp-publish-${item.id}`}
                  >
                    {isRowUpdating ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : item.isPublished ? (
                      <Check size={11} />
                    ) : null}
                    {item.isPublished ? "Published" : "Draft"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditItem(item)}
                    className="focus-ring rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.6)] transition-colors cursor-pointer"
                    aria-label="Edit question paper"
                    data-testid={`button-edit-qp-${item.id}`}
                  >
                    <SlidersHorizontal size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteItem(item)}
                    className="focus-ring rounded-lg border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-1.5 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.15)] transition-colors cursor-pointer"
                    aria-label="Delete question paper"
                    data-testid={`button-delete-qp-${item.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateSemesterQpDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editItem && (
        <EditSemesterQpDialog
          item={editItem}
          open={Boolean(editItem)}
          onOpenChange={(open) => { if (!open) setEditItem(null); }}
        />
      )}
      {deleteItem && (
        <DeleteSemesterQpDialog
          item={deleteItem}
          open={Boolean(deleteItem)}
          onOpenChange={(open) => { if (!open) setDeleteItem(null); }}
        />
      )}
    </div>
  );
}

function AdminIaPapersSection() {
  const queryClient = useQueryClient();
  const [deptManagerOpen, setDeptManagerOpen] = useState(false);
  const { data: iaDepts = [] } = useListIaDepartments({ includeInactive: true });
  const createIaDept = useCreateIaDepartment({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListIaDepartmentsQueryKey() }) } });
  const updateIaDept = useUpdateIaDepartment({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListIaDepartmentsQueryKey() }) } });

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [iaTypeFilter, setIaTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<IaPaperItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<IaPaperItem | null>(null);

  const { data: iaPapers = [], isLoading, isError, refetch } = useListIaPapers({
    isPublished: "all",
  });
  const { data: branches = [] } = useListBranches({ includeInactive: false });

  const updateIaPaper = useUpdateIaPaper();

  const availableSemesters = useMemo(() => {
    if (yearFilter !== "All" && IA_YEAR_SEMESTERS[yearFilter]) {
      return ["All", ...IA_YEAR_SEMESTERS[yearFilter]];
    }
    return [
      "All",
      "1st Semester",
      "2nd Semester",
      "3rd Semester",
      "4th Semester",
      "5th Semester",
      "6th Semester",
      "7th Semester",
      "8th Semester",
    ];
  }, [yearFilter]);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const b of branches) {
      if (b.name) set.add(b.name);
      if (b.shortName) set.add(b.shortName);
    }
    for (const p of iaPapers) {
      if (p.department) set.add(p.department);
    }
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [branches, iaPapers]);

  const filteredIaPapers = useMemo(() => {
    return iaPapers.filter((item) => {
      if (yearFilter !== "All" && item.academicYear !== yearFilter) return false;
      if (semesterFilter !== "All" && item.semester !== semesterFilter) return false;
      if (departmentFilter !== "All" && item.department !== departmentFilter) return false;
      if (iaTypeFilter !== "All" && item.iaType !== iaTypeFilter) return false;
      if (statusFilter === "published" && !item.isPublished) return false;
      if (statusFilter === "draft" && item.isPublished) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const match =
          item.department.toLowerCase().includes(q) ||
          item.semester.toLowerCase().includes(q) ||
          item.academicYear.toLowerCase().includes(q) ||
          item.iaType.toLowerCase().includes(q) ||
          (item.title && item.title.toLowerCase().includes(q)) ||
          item.googleDriveUrl.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [iaPapers, yearFilter, semesterFilter, departmentFilter, iaTypeFilter, statusFilter, search]);

  const handleTogglePublish = (item: IaPaperItem) => {
    if (updateIaPaper.isPending) return;
    setUpdatingId(item.id);
    updateIaPaper.mutate(
      { id: item.id, data: { isPublished: !item.isPublished } },
      {
        onSuccess: () => {
          setUpdatingId(null);
          toast({
            title: item.isPublished ? "Paper unpublished" : "Paper published",
            description: `${item.department} (${item.iaType} - ${item.academicYear}) is now ${item.isPublished ? "in draft" : "public"}.`,
          });
        },
        onError: (err) => {
          setUpdatingId(null);
          toast({
            title: "Error updating status",
            description: getErrorMessage(err),
            variant: "destructive",
          });
        },
      },
    );
  };

  const hasActiveFilters =
    yearFilter !== "All" ||
    semesterFilter !== "All" ||
    departmentFilter !== "All" ||
    iaTypeFilter !== "All" ||
    statusFilter !== "all" ||
    Boolean(search.trim());

  const resetFilters = () => {
    setSearch("");
    setYearFilter("All");
    setSemesterFilter("All");
    setDepartmentFilter("All");
    setIaTypeFilter("All");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Internal Assessment Papers</h2>
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
            Manage continuous internal evaluation papers, Google Drive share links, and publish states.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDeptManagerOpen(true)}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--secondary)/.15)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--secondary-foreground))] transition-colors cursor-pointer w-fit"
          >
            Manage Departments
          </button>
          <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="focus-ring inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xs hover:bg-[hsl(var(--primary)/.9)] transition-colors cursor-pointer w-fit"
          data-testid="button-add-ia-paper"
        >
          <Plus size={15} /> Add IA Paper
        </button>
        </div>
      </div>
      
      <DepartmentManagerDialog
        open={deptManagerOpen}
        onOpenChange={setDeptManagerOpen}
        title="IA Departments"
        departments={iaDepts}
        createDepartment={createIaDept}
        updateDepartment={updateIaDept}
      />

      {/* Filters Bar */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-1">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search IA papers..."
                className="input-style h-9 w-full !pl-9 pr-7 text-xs"
                data-testid="input-admin-search-ia"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <div>
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                if (e.target.value !== "All") {
                  const allowed = IA_YEAR_SEMESTERS[e.target.value] ?? [];
                  if (semesterFilter !== "All" && !allowed.includes(semesterFilter)) {
                    setSemesterFilter("All");
                  }
                }
              }}
              className="input-style h-9 !py-1.5 !px-3 w-full text-xs font-semibold rounded-xl bg-[hsl(var(--card))]"
              data-testid="select-admin-ia-year-filter"
            >
              <option value="All">All Years</option>
              {IA_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 w-full text-xs font-semibold rounded-xl bg-[hsl(var(--card))]"
              data-testid="select-admin-ia-semester-filter"
            >
              {availableSemesters.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All Semesters" : getIaSemesterLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 w-full text-xs font-semibold rounded-xl bg-[hsl(var(--card))]"
              data-testid="select-admin-ia-dept-filter"
            >
              {availableDepartments.map((d) => (
                <option key={d} value={d}>{d === "All" ? "All Departments" : d}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={iaTypeFilter}
              onChange={(e) => setIaTypeFilter(e.target.value)}
              className="input-style h-9 !py-1.5 !px-3 w-full text-xs font-semibold rounded-xl bg-[hsl(var(--card))]"
              data-testid="select-admin-ia-type-filter"
            >
              <option value="All">All Types</option>
              {IA_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "published" | "draft")}
              className="input-style h-9 !py-1.5 !px-3 w-full text-xs font-semibold rounded-xl bg-[hsl(var(--card))]"
              data-testid="select-admin-ia-status-filter"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published only</option>
              <option value="draft">Drafts only</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-[hsl(var(--border)/.5)] text-xs text-[hsl(var(--muted-foreground))]">
            <span>Showing {filteredIaPapers.length} of {iaPapers.length} IA papers</span>
            <button
              type="button"
              onClick={resetFilters}
              className="focus-ring inline-flex items-center gap-1 font-bold text-[hsl(var(--primary))] hover:underline cursor-pointer"
            >
              <RotateCcw size={11} /> Reset filters
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)]" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-6 text-center">
          <p className="text-xs font-bold text-[hsl(var(--destructive))]">Failed to load Internal Assessment papers.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="focus-ring mt-2 inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-xs font-bold"
          >
            <RotateCcw size={12} /> Retry
          </button>
        </div>
      ) : filteredIaPapers.length === 0 ? (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center" data-testid="status-admin-empty-ia">
          <p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">No Internal Assessment papers found.</p>
          <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
            {hasActiveFilters ? "Try clearing or changing your filters." : "Add the first IA paper using the button above."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-3 py-1.5 text-xs font-semibold"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredIaPapers.map((item) => {
            const isRowUpdating = updateIaPaper.isPending && updatingId === item.id;
            const iaType = item.iaType || "IA-1";

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3.5 shadow-xs hover:border-[hsl(var(--border)/.8)] transition-colors"
                data-testid={`row-admin-ia-${item.id}`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[hsl(var(--foreground))] truncate">
                      {item.department}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-[hsl(var(--secondary)/.15)] px-2 py-0.5 text-[11px] font-bold text-[hsl(var(--secondary-foreground))]">
                      {item.academicYear}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-[hsl(var(--muted))] px-2 py-0.5 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                      {getIaSemesterLabel(item.semester)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        iaType === "IA-1"
                          ? "bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))]"
                          : iaType === "IA-2"
                          ? "bg-[hsl(var(--secondary)/.18)] text-[hsl(var(--secondary-foreground))]"
                          : iaType === "IA-3"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-[hsl(var(--accent)/.2)] text-[hsl(var(--accent-foreground))]"
                      }`}
                    >
                      {iaType}
                    </span>
                  </div>
                  {item.title && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                      {item.title}
                    </p>
                  )}
                  <div className="pt-0.5">
                    <a
                      href={item.googleDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-ring inline-flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--primary))] hover:underline max-w-sm truncate"
                    >
                      <FolderOpen size={11} /> {item.googleDriveUrl}
                    </a>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    disabled={updateIaPaper.isPending}
                    onClick={() => handleTogglePublish(item)}
                    className={`focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold cursor-pointer transition-colors disabled:opacity-50 ${
                      item.isPublished
                        ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                        : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                    }`}
                    data-testid={`button-toggle-ia-publish-${item.id}`}
                  >
                    {isRowUpdating ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : item.isPublished ? (
                      <Check size={11} />
                    ) : null}
                    {item.isPublished ? "Published" : "Draft"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditItem(item)}
                    className="focus-ring rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.6)] transition-colors cursor-pointer"
                    aria-label="Edit IA paper"
                    data-testid={`button-edit-ia-${item.id}`}
                  >
                    <SlidersHorizontal size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteItem(item)}
                    className="focus-ring rounded-lg border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-1.5 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.15)] transition-colors cursor-pointer"
                    aria-label="Delete IA paper"
                    data-testid={`button-delete-ia-${item.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateIaPaperDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editItem && (
        <EditIaPaperDialog
          item={editItem}
          open={Boolean(editItem)}
          onOpenChange={(open) => { if (!open) setEditItem(null); }}
        />
      )}
      {deleteItem && (
        <DeleteIaPaperDialog
          item={deleteItem}
          open={Boolean(deleteItem)}
          onOpenChange={(open) => { if (!open) setDeleteItem(null); }}
        />
      )}
    </div>
  );
}

function CreateSemesterQpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (val: boolean) => void }) {
  const createQp = useCreateSemesterQp();
  const { data: branches = [] } = useListBranches({ includeInactive: false });
  const { data: qps = [] } = useListSemesterQps({ isPublished: "all" });

  const [examYear, setExamYear] = useState("2026");
  const [semester, setSemester] = useState("7th Semester");
  const [department, setDepartment] = useState("");
  const [title, setTitle] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [resourceType, setResourceType] = useState<"zip" | "pdf" | "drive" | "link">("zip");
  const [isPublished, setIsPublished] = useState(true);
  const [hasCustomTitle, setHasCustomTitle] = useState(false);
  const [error, setError] = useState("");

  const distinctDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const b of branches) {
      if (b.name) set.add(b.name);
      if (b.shortName) set.add(b.shortName);
    }
    for (const qp of qps) {
      if (qp.department) set.add(qp.department);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [branches, qps]);

  const distinctYears = useMemo(() => {
    const set = new Set<string>(["2028", "2027", "2026", "2025", "2024", "2023", "2022 & Model Papers"]);
    for (const qp of qps) {
      if (qp.examYear) set.add(qp.examYear);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [qps]);

  const computeSmartTitle = (yr: string, sem: string, dept: string) => {
    if (dept.trim()) {
      return `${yr.trim()} • ${sem.trim()} • ${dept.trim()}`;
    }
    return `${yr.trim()} • ${sem.trim()}`;
  };

  const handleYearChange = (val: string) => {
    setExamYear(val);
    if (!hasCustomTitle) {
      setTitle(computeSmartTitle(val, semester, department));
    }
  };

  const handleSemesterChange = (val: string) => {
    setSemester(val);
    if (!hasCustomTitle) {
      setTitle(computeSmartTitle(examYear, val, department));
    }
  };

  const handleDepartmentChange = (val: string) => {
    setDepartment(val);
    if (!hasCustomTitle) {
      setTitle(computeSmartTitle(examYear, semester, val));
    }
  };

  const handleUrlChange = (val: string) => {
    setDownloadUrl(val);
    const urlLower = val.trim().toLowerCase();
    if (urlLower.endsWith(".pdf")) {
      setResourceType("pdf");
    } else if (urlLower.endsWith(".zip")) {
      setResourceType("zip");
    } else if (urlLower.includes("drive.google.com") || urlLower.includes("docs.google.com")) {
      setResourceType("drive");
    }
  };

  const handleRegenerateTitle = () => {
    setTitle(computeSmartTitle(examYear, semester, department));
    setHasCustomTitle(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (createQp.isPending) return;

    if (!examYear.trim()) {
      setError("Exam year is required.");
      return;
    }
    if (!semester.trim()) {
      setError("Semester is required.");
      return;
    }
    if (!department.trim()) {
      setError("Department/stream is required.");
      return;
    }
    if (!downloadUrl.trim()) {
      setError("Download URL is required.");
      return;
    }
    try {
      new URL(downloadUrl.trim());
    } catch {
      setError("Please enter a valid download URL (http:// or https://).");
      return;
    }

    createQp.mutate(
      {
        data: {
          examYear: examYear.trim(),
          semester: semester.trim(),
          department: department.trim(),
          title: title.trim() || undefined,
          downloadUrl: downloadUrl.trim(),
          resourceType,
          isPublished,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Semester Question Paper added successfully" });
          onOpenChange(false);
          setDepartment("");
          setTitle("");
          setDownloadUrl("");
          setHasCustomTitle(false);
          setError("");
        },
        onError: (err) => {
          const msg = getErrorMessage(err);
          if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already exists")) {
            setError("This Semester QP already exists.");
          } else {
            setError(msg);
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setError(""); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl" data-testid="dialog-create-semester-qp">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="display-font text-xl font-bold">Add Semester Question Paper</DialogTitle>
          <DialogDescription className="text-xs text-[hsl(var(--muted-foreground))]">
            Fill the template to publish a newly released question paper bundle without changing application code.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          <datalist id="create-exam-years">
            {distinctYears.map((y) => (
              <option key={y} value={y} />
            ))}
          </datalist>
          <datalist id="create-dept-streams">
            {distinctDepartments.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>

          {/* Row 1: Exam Year & Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                Exam Year <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <input
                type="text"
                list="create-exam-years"
                value={examYear}
                onChange={(e) => handleYearChange(e.target.value)}
                placeholder="e.g. 2026 or 2027"
                className="input-style h-9 text-xs"
                data-testid="input-create-exam-year"
                required
              />
              <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Type any current or future exam year</span>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                Semester <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <select
                value={semester}
                onChange={(e) => handleSemesterChange(e.target.value)}
                className="input-style h-9 text-xs font-semibold rounded-xl bg-[hsl(var(--card))]"
                data-testid="select-create-semester"
              >
                {POPULAR_SEMESTERS.filter((s) => s !== "All").map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Department / Stream */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
              Department / Stream <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <input
              type="text"
              list="create-dept-streams"
              value={department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              placeholder="e.g. CSE / AIML / AI / DS or ECE or Civil (CV)"
              className="input-style h-9 text-xs"
              data-testid="input-create-department"
              required
            />
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Select from existing branches or type a custom stream</span>
          </div>

          {/* Row 3: Smart Title */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                Display Title (Smart Generated)
              </label>
              {hasCustomTitle && (
                <button
                  type="button"
                  onClick={handleRegenerateTitle}
                  className="text-[10px] font-bold text-[hsl(var(--primary))] hover:underline cursor-pointer"
                >
                  Regenerate
                </button>
              )}
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasCustomTitle(true);
              }}
              placeholder="e.g. 2026 • 7th Semester • ME"
              className="input-style h-9 text-xs"
              data-testid="input-create-title"
            />
          </div>

          {/* Row 4: Resource Type Segmented Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
              Resource Type <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setResourceType("zip")}
                className={`focus-ring inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold transition-colors cursor-pointer border ${
                  resourceType === "zip"
                    ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.15)] text-[hsl(var(--secondary-foreground))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)]"
                }`}
              >
                <FileArchive size={12} /> ZIP
              </button>
              <button
                type="button"
                onClick={() => setResourceType("pdf")}
                className={`focus-ring inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold transition-colors cursor-pointer border ${
                  resourceType === "pdf"
                    ? "border-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)]"
                }`}
              >
                <FileText size={12} /> PDF
              </button>
              <button
                type="button"
                onClick={() => setResourceType("drive")}
                className={`focus-ring inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold transition-colors cursor-pointer border ${
                  resourceType === "drive"
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)]"
                }`}
              >
                <FolderOpen size={12} /> Drive Link
              </button>
              <button
                type="button"
                onClick={() => setResourceType("link")}
                className={`focus-ring inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold transition-colors cursor-pointer border ${
                  resourceType === "link"
                    ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.2)] text-[hsl(var(--accent-foreground))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)]"
                }`}
              >
                <ExternalLink size={12} /> Web Link
              </button>
            </div>
            {resourceType === "drive" && (
              <p className="text-[11px] text-[hsl(var(--primary))] font-medium">
                Make sure your Google Drive link is set to "Anyone with the link can view".
              </p>
            )}
          </div>

          {/* Row 5: Download URL */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
              Download / Access URL <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <input
              type="url"
              value={downloadUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://www.bitm.edu.in/assets/.../sample.zip or Google Drive URL"
              className="input-style h-9 text-xs"
              data-testid="input-create-download-url"
              required
            />
          </div>

          {/* Row 6: Published Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[hsl(var(--foreground))]">Publication Status</span>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {isPublished ? "Visible to all students on the public PYQs page" : "Saved as draft, visible only to admins"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                isPublished
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                  : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
              }`}
              data-testid="button-toggle-create-published"
            >
              {isPublished ? <Check size={13} /> : null}
              {isPublished ? "Published (ON)" : "Draft (OFF)"}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]" data-testid="alert-create-qp-error">
              <CircleAlert size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="mt-5 flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createQp.isPending}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60 cursor-pointer"
              data-testid="button-submit-create-semester-qp"
            >
              {createQp.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {createQp.isPending ? "Adding Paper..." : "Add Semester QP"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditSemesterQpDialog({ item, open, onOpenChange }: { item: SemesterQpItem; open: boolean; onOpenChange: (val: boolean) => void }) {
  const updateQp = useUpdateSemesterQp();
  const { data: branches = [] } = useListBranches({ includeInactive: false });
  const { data: qps = [] } = useListSemesterQps({ isPublished: "all" });

  const [examYear, setExamYear] = useState(item.examYear);
  const [semester, setSemester] = useState(item.semester);
  const [department, setDepartment] = useState(item.department);
  const [title, setTitle] = useState(item.title || "");
  const [downloadUrl, setDownloadUrl] = useState(item.downloadUrl);
  const [resourceType, setResourceType] = useState<"zip" | "pdf" | "drive" | "link">(
    (item.resourceType as "zip" | "pdf" | "drive" | "link") ||
      (item.downloadUrl.toLowerCase().endsWith(".pdf")
        ? "pdf"
        : item.downloadUrl.toLowerCase().endsWith(".zip")
        ? "zip"
        : item.downloadUrl.toLowerCase().includes("drive.google.com")
        ? "drive"
        : "link"),
  );
  const [isPublished, setIsPublished] = useState(item.isPublished);
  const [error, setError] = useState("");

  const distinctDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const b of branches) {
      if (b.name) set.add(b.name);
      if (b.shortName) set.add(b.shortName);
    }
    for (const q of qps) {
      if (q.department) set.add(q.department);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [branches, qps]);

  const distinctYears = useMemo(() => {
    const set = new Set<string>(["2028", "2027", "2026", "2025", "2024", "2023", "2022 & Model Papers"]);
    for (const q of qps) {
      if (q.examYear) set.add(q.examYear);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [qps]);

  const handleRegenerateTitle = () => {
    if (department.trim()) {
      setTitle(`${examYear.trim()} • ${semester.trim()} • ${department.trim()}`);
    } else {
      setTitle(`${examYear.trim()} • ${semester.trim()}`);
    }
  };

  const handleUrlChange = (val: string) => {
    setDownloadUrl(val);
    const urlLower = val.trim().toLowerCase();
    if (urlLower.endsWith(".pdf")) {
      setResourceType("pdf");
    } else if (urlLower.endsWith(".zip")) {
      setResourceType("zip");
    } else if (urlLower.includes("drive.google.com") || urlLower.includes("docs.google.com")) {
      setResourceType("drive");
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (updateQp.isPending) return;

    if (!examYear.trim()) {
      setError("Exam year is required.");
      return;
    }
    if (!semester.trim()) {
      setError("Semester is required.");
      return;
    }
    if (!department.trim()) {
      setError("Department/stream is required.");
      return;
    }
    if (!downloadUrl.trim()) {
      setError("Download URL is required.");
      return;
    }
    try {
      new URL(downloadUrl.trim());
    } catch {
      setError("Please enter a valid download URL (http:// or https://).");
      return;
    }

    updateQp.mutate(
      {
        id: item.id,
        data: {
          examYear: examYear.trim(),
          semester: semester.trim(),
          department: department.trim(),
          title: title.trim(),
          downloadUrl: downloadUrl.trim(),
          resourceType,
          isPublished,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Question paper updated successfully" });
          onOpenChange(false);
        },
        onError: (err) => {
          const msg = getErrorMessage(err);
          if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already exists")) {
            setError("This Semester QP already exists.");
          } else {
            setError(msg);
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setError(""); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl" data-testid="dialog-edit-semester-qp">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="display-font text-xl font-bold">Edit Semester Question Paper</DialogTitle>
          <DialogDescription className="text-xs text-[hsl(var(--muted-foreground))]">
            Update examination year, department stream, resource link, and publication status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          <datalist id="edit-exam-years">
            {distinctYears.map((y) => (
              <option key={y} value={y} />
            ))}
          </datalist>
          <datalist id="edit-dept-streams">
            {distinctDepartments.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>

          {/* Row 1: Exam Year & Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                Exam Year <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <input
                type="text"
                list="edit-exam-years"
                value={examYear}
                onChange={(e) => setExamYear(e.target.value)}
                className="input-style h-9 text-xs"
                data-testid="input-edit-exam-year"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                Semester <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="input-style h-9 text-xs font-semibold rounded-xl bg-[hsl(var(--card))]"
                data-testid="select-edit-semester"
              >
                {POPULAR_SEMESTERS.filter((s) => s !== "All").map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Department / Stream */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
              Department / Stream <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <input
              type="text"
              list="edit-dept-streams"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="input-style h-9 text-xs"
              data-testid="input-edit-department"
              required
            />
          </div>

          {/* Row 3: Display Title */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                Display Title (Optional)
              </label>
              <button
                type="button"
                onClick={handleRegenerateTitle}
                className="text-[10px] font-bold text-[hsl(var(--primary))] hover:underline cursor-pointer"
              >
                Regenerate smart title
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-style h-9 text-xs"
              data-testid="input-edit-title"
            />
          </div>

          {/* Row 4: Resource Type Segmented Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
              Resource Type <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setResourceType("zip")}
                className={`focus-ring inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold transition-colors cursor-pointer border ${
                  resourceType === "zip"
                    ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary)/.15)] text-[hsl(var(--secondary-foreground))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)]"
                }`}
              >
                <FileArchive size={12} /> ZIP
              </button>
              <button
                type="button"
                onClick={() => setResourceType("pdf")}
                className={`focus-ring inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold transition-colors cursor-pointer border ${
                  resourceType === "pdf"
                    ? "border-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/.12)] text-[hsl(var(--destructive))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)]"
                }`}
              >
                <FileText size={12} /> PDF
              </button>
              <button
                type="button"
                onClick={() => setResourceType("drive")}
                className={`focus-ring inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold transition-colors cursor-pointer border ${
                  resourceType === "drive"
                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)]"
                }`}
              >
                <FolderOpen size={12} /> Drive Link
              </button>
              <button
                type="button"
                onClick={() => setResourceType("link")}
                className={`focus-ring inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold transition-colors cursor-pointer border ${
                  resourceType === "link"
                    ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.2)] text-[hsl(var(--accent-foreground))]"
                    : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)]"
                }`}
              >
                <ExternalLink size={12} /> Web Link
              </button>
            </div>
            {resourceType === "drive" && (
              <p className="text-[11px] text-[hsl(var(--primary))] font-medium">
                Make sure your Google Drive link is set to "Anyone with the link can view".
              </p>
            )}
          </div>

          {/* Row 5: Download URL */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
              Download URL <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <input
              type="url"
              value={downloadUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="input-style h-9 text-xs"
              data-testid="input-edit-download-url"
              required
            />
          </div>

          {/* Row 6: Published Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[hsl(var(--foreground))]">Publication Status</span>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {isPublished ? "Visible to all students on the public PYQs page" : "Saved as draft, visible only to admins"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                isPublished
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                  : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
              }`}
              data-testid="button-toggle-edit-published"
            >
              {isPublished ? <Check size={13} /> : null}
              {isPublished ? "Published (ON)" : "Draft (OFF)"}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]" data-testid="alert-edit-qp-error">
              <CircleAlert size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="mt-5 flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateQp.isPending}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60 cursor-pointer"
              data-testid="button-submit-edit-semester-qp"
            >
              {updateQp.isPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {updateQp.isPending ? "Saving Changes..." : "Save Changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSemesterQpDialog({ item, open, onOpenChange }: { item: SemesterQpItem; open: boolean; onOpenChange: (val: boolean) => void }) {
  const deleteQp = useDeleteSemesterQp();

  const handleConfirm = () => {
    if (deleteQp.isPending) return;
    deleteQp.mutate(
      { id: item.id },
      {
        onSuccess: () => {
          toast({ title: "Question paper deleted" });
          onOpenChange(false);
        },
        onError: (err) => {
          toast({ title: "Error deleting paper", description: getErrorMessage(err), variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 rounded-3xl" data-testid="dialog-delete-semester-qp">
        <DialogHeader className="text-left space-y-1.5">
          <div className="flex items-center gap-2 text-[hsl(var(--destructive))]">
            <Trash2 size={18} />
            <DialogTitle className="display-font text-xl font-bold">Delete Question Paper</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[hsl(var(--muted-foreground))]">
            Are you sure you want to delete the question paper for <span className="font-semibold text-[hsl(var(--foreground))]">"{item.department}" ({item.semester} - {item.examYear})</span>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-5 flex gap-2 sm:justify-end">
          <button
            type="button"
            disabled={deleteQp.isPending}
            onClick={() => onOpenChange(false)}
            className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleteQp.isPending}
            onClick={handleConfirm}
            className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--destructive))] px-5 py-2 text-xs font-bold text-[hsl(var(--destructive-foreground))] hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
            data-testid="button-confirm-delete-semester-qp"
          >
            {deleteQp.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {deleteQp.isPending ? "Deleting..." : "Delete"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateIaPaperDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (val: boolean) => void }) {
  const createIa = useCreateIaPaper();
  const { data: branches = [] } = useListBranches({ includeInactive: false });
  const { data: iaPapers = [] } = useListIaPapers({ isPublished: "all" });

  const [academicYear, setAcademicYear] = useState<string>("1st Year");
  const [semester, setSemester] = useState<string>("1st Semester");
  const [department, setDepartment] = useState("");
  const [iaType, setIaType] = useState<string>("IA-1");
  const [title, setTitle] = useState("");
  const [googleDriveUrl, setGoogleDriveUrl] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [hasCustomTitle, setHasCustomTitle] = useState(false);
  const [error, setError] = useState("");

  const distinctDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const b of branches) {
      if (b.name) set.add(b.name);
      if (b.shortName) set.add(b.shortName);
    }
    for (const p of iaPapers) {
      if (p.department) set.add(p.department);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [branches, iaPapers]);

  const availableSemesters = useMemo(() => {
    return IA_YEAR_SEMESTERS[academicYear] ?? [
      "1st Semester",
      "2nd Semester",
      "3rd Semester",
      "4th Semester",
      "5th Semester",
      "6th Semester",
      "7th Semester",
      "8th Semester",
    ];
  }, [academicYear]);

  const handleYearChange = (newYear: string) => {
    setAcademicYear(newYear);
    const sems = IA_YEAR_SEMESTERS[newYear];
    const newSem = sems ? sems[0] : "1st Semester";
    setSemester(newSem);
    if (!hasCustomTitle) {
      if (department.trim()) {
        setTitle(`${newYear} • ${newSem} • ${department.trim()} • ${iaType}`);
      } else {
        setTitle(`${newYear} • ${newSem} • ${iaType}`);
      }
    }
  };

  const handleSemesterChange = (newSem: string) => {
    setSemester(newSem);
    if (!hasCustomTitle) {
      if (department.trim()) {
        setTitle(`${academicYear} • ${newSem} • ${department.trim()} • ${iaType}`);
      } else {
        setTitle(`${academicYear} • ${newSem} • ${iaType}`);
      }
    }
  };

  const handleDepartmentChange = (val: string) => {
    setDepartment(val);
    if (!hasCustomTitle) {
      if (val.trim()) {
        setTitle(`${academicYear} • ${semester} • ${val.trim()} • ${iaType}`);
      } else {
        setTitle(`${academicYear} • ${semester} • ${iaType}`);
      }
    }
  };

  const handleIaTypeChange = (newType: string) => {
    setIaType(newType);
    if (!hasCustomTitle) {
      if (department.trim()) {
        setTitle(`${academicYear} • ${semester} • ${department.trim()} • ${newType}`);
      } else {
        setTitle(`${academicYear} • ${semester} • ${newType}`);
      }
    }
  };

  const handleRegenerateTitle = () => {
    if (department.trim()) {
      setTitle(`${academicYear} • ${semester} • ${department.trim()} • ${iaType}`);
    } else {
      setTitle(`${academicYear} • ${semester} • ${iaType}`);
    }
    setHasCustomTitle(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (createIa.isPending) return;

    if (!department.trim()) {
      setError("Department/stream is required.");
      return;
    }
    if (!googleDriveUrl.trim()) {
      setError("Google Drive URL is required.");
      return;
    }
    if (!isValidGoogleDriveUrl(googleDriveUrl.trim())) {
      setError("Please enter a valid https://drive.google.com or https://docs.google.com share link.");
      return;
    }

    createIa.mutate(
      {
        data: {
          academicYear,
          semester,
          department: department.trim(),
          iaType,
          title: title.trim(),
          googleDriveUrl: googleDriveUrl.trim(),
          isPublished,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Internal assessment paper added successfully" });
          onOpenChange(false);
          setDepartment("");
          setTitle("");
          setGoogleDriveUrl("");
          setHasCustomTitle(false);
          setError("");
        },
        onError: (err) => {
          const msg = getErrorMessage(err);
          if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already exists")) {
            setError("This Internal Assessment paper already exists.");
          } else {
            setError(msg);
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setError(""); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl" data-testid="dialog-create-ia-paper">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="display-font text-xl font-bold">Add Internal Assessment Paper</DialogTitle>
          <DialogDescription className="text-xs text-[hsl(var(--muted-foreground))]">
            Select year cohort, semester, department, test type, and Google Drive access link.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          <datalist id="create-ia-dept-streams">
            {distinctDepartments.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>

          {/* Row 1: Academic Year Segmented */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
              Academic Year <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {IA_YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => handleYearChange(y)}
                  className={`focus-ring inline-flex items-center justify-center rounded-xl py-2 text-xs font-bold transition-colors cursor-pointer border ${
                    academicYear === y
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))]"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)]"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Semester & IA Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                Semester <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <select
                value={semester}
                onChange={(e) => handleSemesterChange(e.target.value)}
                className="input-style h-9 text-xs font-semibold rounded-xl bg-[hsl(var(--card))]"
                data-testid="select-create-ia-semester"
              >
                {availableSemesters.map((s) => (
                  <option key={s} value={s}>
                    {getIaSemesterLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                IA Type <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {IA_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleIaTypeChange(t)}
                    className={`focus-ring inline-flex items-center justify-center rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer border ${
                      iaType === t
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                        : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Department / Stream */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
              Department / Stream <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <input
              type="text"
              list="create-ia-dept-streams"
              value={department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              placeholder="e.g. Computer Science & Engineering or CSE"
              className="input-style h-9 text-xs"
              data-testid="input-create-ia-dept"
              required
            />
          </div>

          {/* Row 4: Smart Title */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                Display Title (Smart Generated)
              </label>
              {hasCustomTitle && (
                <button
                  type="button"
                  onClick={handleRegenerateTitle}
                  className="text-[10px] font-bold text-[hsl(var(--primary))] hover:underline cursor-pointer"
                >
                  Regenerate
                </button>
              )}
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasCustomTitle(true);
              }}
              placeholder="e.g. 2nd Year • 3rd Semester • CSE • IA-1"
              className="input-style h-9 text-xs"
              data-testid="input-create-ia-title"
            />
          </div>

          {/* Row 5: Google Drive URL */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
              Google Drive URL <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <input
              type="url"
              value={googleDriveUrl}
              onChange={(e) => setGoogleDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/... or /drive/folders/..."
              className="input-style h-9 text-xs"
              data-testid="input-create-ia-drive-url"
              required
            />
            <p className="text-[11px] text-[hsl(var(--primary))] font-medium">
              Make sure the file or folder is shared so students with the link can view it.
            </p>
          </div>

          {/* Row 6: Published Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[hsl(var(--foreground))]">Publication Status</span>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {isPublished ? "Visible to all students on the public IA tab" : "Saved as draft, visible only to admins"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                isPublished
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                  : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
              }`}
              data-testid="button-toggle-create-ia-published"
            >
              {isPublished ? <Check size={13} /> : null}
              {isPublished ? "Published (ON)" : "Draft (OFF)"}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]" data-testid="alert-create-ia-error">
              <CircleAlert size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="mt-5 flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createIa.isPending}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60 cursor-pointer"
              data-testid="button-submit-create-ia-paper"
            >
              {createIa.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {createIa.isPending ? "Adding Paper..." : "Add IA Paper"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditIaPaperDialog({ item, open, onOpenChange }: { item: IaPaperItem; open: boolean; onOpenChange: (val: boolean) => void }) {
  const updateIa = useUpdateIaPaper();
  const { data: branches = [] } = useListBranches({ includeInactive: false });
  const { data: iaPapers = [] } = useListIaPapers({ isPublished: "all" });

  const [academicYear, setAcademicYear] = useState(item.academicYear);
  const [semester, setSemester] = useState(item.semester);
  const [department, setDepartment] = useState(item.department);
  const [iaType, setIaType] = useState(item.iaType || "IA-1");
  const [title, setTitle] = useState(item.title || "");
  const [googleDriveUrl, setGoogleDriveUrl] = useState(item.googleDriveUrl);
  const [isPublished, setIsPublished] = useState(item.isPublished);
  const [error, setError] = useState("");

  const distinctDepartments = useMemo(() => {
    const set = new Set<string>();
    for (const b of branches) {
      if (b.name) set.add(b.name);
      if (b.shortName) set.add(b.shortName);
    }
    for (const p of iaPapers) {
      if (p.department) set.add(p.department);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [branches, iaPapers]);

  const availableSemesters = useMemo(() => {
    return IA_YEAR_SEMESTERS[academicYear] ?? [
      "1st Semester",
      "2nd Semester",
      "3rd Semester",
      "4th Semester",
      "5th Semester",
      "6th Semester",
      "7th Semester",
      "8th Semester",
    ];
  }, [academicYear]);

  const handleRegenerateTitle = () => {
    if (department.trim()) {
      setTitle(`${academicYear} • ${semester} • ${department.trim()} • ${iaType}`);
    } else {
      setTitle(`${academicYear} • ${semester} • ${iaType}`);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (updateIa.isPending) return;

    if (!department.trim()) {
      setError("Department/stream is required.");
      return;
    }
    if (!googleDriveUrl.trim()) {
      setError("Google Drive URL is required.");
      return;
    }
    if (!isValidGoogleDriveUrl(googleDriveUrl.trim())) {
      setError("Please enter a valid https://drive.google.com or https://docs.google.com share link.");
      return;
    }

    updateIa.mutate(
      {
        id: item.id,
        data: {
          academicYear,
          semester,
          department: department.trim(),
          iaType,
          title: title.trim(),
          googleDriveUrl: googleDriveUrl.trim(),
          isPublished,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Internal assessment paper updated successfully" });
          onOpenChange(false);
        },
        onError: (err) => {
          const msg = getErrorMessage(err);
          if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already exists")) {
            setError("This Internal Assessment paper already exists.");
          } else {
            setError(msg);
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) setError(""); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl" data-testid="dialog-edit-ia-paper">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="display-font text-xl font-bold">Edit Internal Assessment Paper</DialogTitle>
          <DialogDescription className="text-xs text-[hsl(var(--muted-foreground))]">
            Update year, semester, department, test type, and Google Drive access link.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          <datalist id="edit-ia-dept-streams">
            {distinctDepartments.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>

          {/* Row 1: Academic Year Segmented */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
              Academic Year <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {IA_YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setAcademicYear(y)}
                  className={`focus-ring inline-flex items-center justify-center rounded-xl py-2 text-xs font-bold transition-colors cursor-pointer border ${
                    academicYear === y
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.15)] text-[hsl(var(--primary))]"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)]"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Semester & IA Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                Semester <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="input-style h-9 text-xs font-semibold rounded-xl bg-[hsl(var(--card))]"
                data-testid="select-edit-ia-semester"
              >
                {availableSemesters.map((s) => (
                  <option key={s} value={s}>
                    {getIaSemesterLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                IA Type <span className="text-[hsl(var(--destructive))]">*</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {IA_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setIaType(t)}
                    className={`focus-ring inline-flex items-center justify-center rounded-lg py-1.5 text-xs font-bold transition-colors cursor-pointer border ${
                      iaType === t
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                        : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted)/.5)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Department / Stream */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
              Department / Stream <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <input
              type="text"
              list="edit-ia-dept-streams"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="input-style h-9 text-xs"
              data-testid="input-edit-ia-dept"
              required
            />
          </div>

          {/* Row 4: Display Title */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
                Display Title (Optional)
              </label>
              <button
                type="button"
                onClick={handleRegenerateTitle}
                className="text-[10px] font-bold text-[hsl(var(--primary))] hover:underline cursor-pointer"
              >
                Regenerate smart title
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-style h-9 text-xs"
              data-testid="input-edit-ia-title"
            />
          </div>

          {/* Row 5: Google Drive URL */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[hsl(var(--foreground))]">
              Google Drive URL <span className="text-[hsl(var(--destructive))]">*</span>
            </label>
            <input
              type="url"
              value={googleDriveUrl}
              onChange={(e) => setGoogleDriveUrl(e.target.value)}
              className="input-style h-9 text-xs"
              data-testid="input-edit-ia-drive-url"
              required
            />
            <p className="text-[11px] text-[hsl(var(--primary))] font-medium">
              Make sure the file or folder is shared so students with the link can view it.
            </p>
          </div>

          {/* Row 6: Published Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] p-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[hsl(var(--foreground))]">Publication Status</span>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                {isPublished ? "Visible to all students on the public IA tab" : "Saved as draft, visible only to admins"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors ${
                isPublished
                  ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                  : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
              }`}
              data-testid="button-toggle-edit-ia-published"
            >
              {isPublished ? <Check size={13} /> : null}
              {isPublished ? "Published (ON)" : "Draft (OFF)"}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-[hsl(var(--destructive)/.1)] p-3 text-xs font-semibold text-[hsl(var(--destructive))]" data-testid="alert-edit-ia-error">
              <CircleAlert size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="mt-5 flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateIa.isPending}
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--primary))] px-5 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] disabled:opacity-60 cursor-pointer"
              data-testid="button-submit-edit-ia-paper"
            >
              {updateIa.isPending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {updateIa.isPending ? "Saving Changes..." : "Save Changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteIaPaperDialog({ item, open, onOpenChange }: { item: IaPaperItem; open: boolean; onOpenChange: (val: boolean) => void }) {
  const deleteIa = useDeleteIaPaper();

  const handleConfirm = () => {
    if (deleteIa.isPending) return;
    deleteIa.mutate(
      { id: item.id },
      {
        onSuccess: () => {
          toast({ title: "IA paper deleted" });
          onOpenChange(false);
        },
        onError: (err) => {
          toast({ title: "Error deleting paper", description: getErrorMessage(err), variant: "destructive" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 rounded-3xl" data-testid="dialog-delete-ia-paper">
        <DialogHeader className="text-left space-y-1.5">
          <div className="flex items-center gap-2 text-[hsl(var(--destructive))]">
            <Trash2 size={18} />
            <DialogTitle className="display-font text-xl font-bold">Delete IA Paper</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[hsl(var(--muted-foreground))]">
            Are you sure you want to delete the IA paper for <span className="font-semibold text-[hsl(var(--foreground))]">"{item.department}" ({item.iaType} - {getIaSemesterLabel(item.semester)} - {item.academicYear})</span>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-5 flex gap-2 sm:justify-end">
          <button
            type="button"
            disabled={deleteIa.isPending}
            onClick={() => onOpenChange(false)}
            className="focus-ring rounded-xl border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleteIa.isPending}
            onClick={handleConfirm}
            className="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--destructive))] px-5 py-2 text-xs font-bold text-[hsl(var(--destructive-foreground))] hover:opacity-90 disabled:opacity-60 transition-opacity cursor-pointer"
            data-testid="button-confirm-delete-ia-paper"
          >
            {deleteIa.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {deleteIa.isPending ? "Deleting..." : "Delete"}
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
    <Route path="/pyqs"><PyqsPage /></Route>
    <Route path="/quick-links"><QuickLinksPage /></Route>
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
    <Route path="/admin/pyqs"><RequireAdmin><AdminLayout><AdminPyqs /></AdminLayout></RequireAdmin></Route>
    <Route path="/admin/quick-links"><RequireAdmin><AdminLayout><AdminQuickLinks /></AdminLayout></RequireAdmin></Route>
    <Route path="/admin/reports"><RequireAdmin><AdminReports /></RequireAdmin></Route>
    <Route path="/admin/feedback"><RequireAdmin><AdminFeedback /></RequireAdmin></Route>
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><AuthProvider><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}><Shell><AppRouter /></Shell></WouterRouter><ApiWakeOverlay /><Toaster /></TooltipProvider></AuthProvider></QueryClientProvider>;
}

export default App;



function AdminIaContributionsSection() {
  const [activeStatus, setActiveStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [page, setPage] = useState(1);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: listResp, isLoading } = useListSubmissions(
    { status: activeStatus },
    qOpts(true)
  );

  const approveSubmission = useApproveSubmission({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() }); queryClient.invalidateQueries({ queryKey: getListIaPapersQueryKey() }); queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey() }); } } });
  const rejectSubmission = useRejectSubmission({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() }) } });

  const handleApprove = (item: any) => {
    approveSubmission.mutate(
      { id: item.id, data: { isVerified: true, isFeatured: false } },
      {
        onSuccess: () => toast({ title: "Approved successfully", description: "The IA paper is now public." }),
        onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
      }
    );
  };

  const handleReject = () => {
    if (rejectingId === null) return;
    rejectSubmission.mutate(
      { id: rejectingId, data: { rejectionReason: rejectReason } },
      {
        onSuccess: () => {
          toast({ title: "Rejected successfully" });
          setRejectingId(null);
          setRejectReason("");
        },
        onError: (err) => toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
      }
    );
  };

  // Filter out non-IA submissions client-side if they happen to bleed through
  const items = (listResp || []).filter(item => item.resourceType === "Internal Assessment");

  return (
    <div className="space-y-6">
      <div className="flex border-b border-[hsl(var(--border))]">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setActiveStatus(s); setPage(1); }}
            className={`px-4 py-2 text-xs font-bold capitalize border-b-2 ${activeStatus === s ? "border-[hsl(var(--secondary))] text-[hsl(var(--foreground))]" : "border-transparent text-[hsl(var(--muted-foreground))]"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-[hsl(var(--muted-foreground))]" /></div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-xs text-[hsl(var(--muted-foreground))]">No {activeStatus} IA contributions found.</div>
        ) : (
          items.map((item: any) => (
            <div key={item.id} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-xl p-4 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm">{item.title}</h3>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    {item.iaAcademicYear} • {item.iaSemester} • {item.iaDepartment} • {item.iaType}
                  </div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] mt-2 border border-[hsl(var(--border))] rounded bg-[hsl(var(--background))] px-2 py-1 inline-block">
                    By {item.studentName} ({item.studentEmail}) on {new Date(item.submittedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <a href={item.googleDriveUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-[hsl(var(--primary))] hover:underline self-end">
                    View Drive Link
                  </a>
                  {activeStatus === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => setRejectingId(item.id)} className="px-3 py-1 text-xs font-bold bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))] rounded-lg">Reject</button>
                      <button onClick={() => handleApprove(item)} className="px-3 py-1 text-xs font-bold bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg">Approve</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {rejectingId && (
        <Dialog open={true} onOpenChange={() => { setRejectingId(null); setRejectReason(""); }}>
          <DialogContent className="sm:max-w-md p-6 rounded-3xl">
            <DialogHeader><DialogTitle>Reject IA Contribution</DialogTitle></DialogHeader>
            <textarea
              className="input-style min-h-24 mt-4"
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRejectingId(null)} className="px-4 py-2 font-bold text-xs">Cancel</button>
              <button onClick={handleReject} disabled={rejectSubmission.isPending} className="px-4 py-2 bg-[hsl(var(--destructive))] text-white font-bold rounded-xl text-xs">Reject</button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


