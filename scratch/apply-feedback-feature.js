const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'artifacts', 'nexora', 'src', 'App.tsx');
let code = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Imports
code = code.replace(
  'import { BuyMePaneerFooter } from "@/components/buy-me-paneer";',
  'import { BuyMePaneerFooter } from "@/components/buy-me-paneer";\nimport { FeedbackDialog } from "@/components/feedback-dialog";'
);

code = code.replace(
  'ArrowLeft, ArrowRight, BarChart3,',
  'ArrowLeft, ArrowRight, BarChart3, Bug, MessageSquare, MessageSquarePlus,'
);

code = code.replace(
  '  useListSemesterQpDepartments,',
  `  useCreateFeedback,
  useListFeedback,
  useUpdateFeedback,
  useDeleteFeedback,
  getListFeedbackQueryKey,
  type Feedback,
  type FeedbackCategory,
  type FeedbackStatus,
  useListSemesterQpDepartments,`
);

// 2. Home Component
const oldHome = `function Home() {
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
}`;

const newHome = `function Home() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("improvement");
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
              <button
                type="button"
                onClick={() => {
                  setFeedbackCategory("improvement");
                  setFeedbackOpen(true);
                }}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-[hsl(var(--foreground))] shadow-xs transition-all hover:border-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary)/.1)] cursor-pointer active:scale-95"
                data-testid="button-home-feedback-pill"
              >
                <span>💡</span>
                <span>Feedback & Bugs</span>
              </button>
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
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackCategory("improvement");
                    setFeedbackOpen(true);
                  }}
                  className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5 text-sm font-bold text-[hsl(var(--foreground))] shadow-sm transition-colors hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] cursor-pointer active:scale-95"
                  data-testid="button-home-hero-feedback"
                >
                  <MessageSquarePlus size={16} />
                  <span>Give Feedback</span>
                </button>
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

        <section className="mt-14 rounded-[28px] border border-[hsl(var(--border))] bg-gradient-to-br from-[hsl(var(--card))] via-[hsl(var(--card))] to-[hsl(var(--secondary)/.08)] p-6 sm:p-10 shadow-sm fade-up" data-testid="section-feedback-callout">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-xl text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--secondary)/.2)] px-3 py-1 text-xs font-bold text-[hsl(var(--secondary-foreground))] mb-3">
                <Sparkles size={13} /> Help Improve Nexora
              </div>
              <h2 className="display-font text-2xl sm:text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                Found a bug or have a suggestion?
              </h2>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-[hsl(var(--muted-foreground))]">
                Have ideas for new features, noticed an error or broken link, or have suggestions for improvements? We read every submission and build what students need!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFeedbackCategory("bug");
                  setFeedbackOpen(true);
                }}
                className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] px-5 text-sm font-bold text-[hsl(var(--destructive))] shadow-xs transition-all hover:bg-[hsl(var(--destructive)/.18)] cursor-pointer active:scale-95"
                data-testid="button-home-report-bug"
              >
                <Bug size={16} /> Report a Bug
              </button>
              <button
                type="button"
                onClick={() => {
                  setFeedbackCategory("improvement");
                  setFeedbackOpen(true);
                }}
                className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-all hover:bg-[hsl(var(--primary)/.9)] cursor-pointer active:scale-95"
                data-testid="button-home-give-feedback"
              >
                <MessageSquarePlus size={16} /> Give Feedback
              </button>
            </div>
          </div>
        </section>

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

      <FeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        initialCategory={feedbackCategory}
      />
    </div>
  );
}`;

if (!code.includes(oldHome)) {
  console.error('oldHome not matched');
  process.exit(1);
}
code = code.replace(oldHome, newHome);

// 3. Admin tabs
code = code.replace(
  `    { href: "/admin/pyqs", label: "PYQs", testId: "link-admin-pyqs" },\n    { href: "/admin/reports", label: "Reports", testId: "link-admin-reports" },`,
  `    { href: "/admin/pyqs", label: "PYQs", testId: "link-admin-pyqs" },\n    { href: "/admin/reports", label: "Reports", testId: "link-admin-reports" },\n    { href: "/admin/feedback", label: "Feedback", testId: "link-admin-feedback" },`
);

// 4. AdminFeedback component
const adminFeedbackCode = `
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
        toast({ title: \`Feedback marked as \${status}\` });
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
                className={\`focus-ring rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors \${
                  filterStatus === s
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }\`}
                data-testid={\`button-filter-feedback-\${s}\`}
              >
                {s} {s === "pending" && counts.pending > 0 ? \`(\${counts.pending})\` : ""}
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
            className={\`focus-ring rounded-full px-3 py-1 text-xs font-semibold border transition-all \${
              filterCategory === c.id
                ? "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-xs"
                : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
            }\`}
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
                data-testid={\`feedback-card-\${item.id}\`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={\`rounded-full px-2.5 py-0.5 text-[11px] font-bold border \${
                          isBug
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            : isImprovement
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : isContent
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        }\`}
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
                            href={\`mailto:\${item.email}\`}
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
                        data-testid={\`button-feedback-review-\${item.id}\`}
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
`;

code = code.replace('function AdminReports() {', adminFeedbackCode + '\nfunction AdminReports() {');

// 5. Route in AppRouter
code = code.replace(
  '<Route path="/admin/reports"><RequireAdmin><AdminReports /></RequireAdmin></Route>',
  '<Route path="/admin/reports"><RequireAdmin><AdminReports /></RequireAdmin></Route>\n    <Route path="/admin/feedback"><RequireAdmin><AdminFeedback /></RequireAdmin></Route>'
);

fs.writeFileSync(appPath, code, 'utf8');
console.log('Successfully applied feedback feature to App.tsx');
