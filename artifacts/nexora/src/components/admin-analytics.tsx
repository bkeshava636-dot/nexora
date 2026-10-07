import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useGetAdminAnalyticsStats,
  type DailyBreakdownItem,
} from "@workspace/api-client-react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Clock3,
  Eye,
  Globe,
  Laptop,
  Loader2,
  RefreshCw,
  Smartphone,
  Tablet,
  TrendingUp,
  Users,
} from "lucide-react";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
}

function DailyChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))] p-3 shadow-lg">
      <p className="mb-2 text-xs font-bold text-[hsl(var(--foreground))]">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-[hsl(var(--muted-foreground))]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-bold text-[hsl(var(--foreground))]">
              {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminAnalytics() {
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const { data, isLoading, isError, refetch, isFetching } =
    useGetAdminAnalyticsStats(selectedDays);

  const dayOptions = [
    { label: "Last 7 Days", value: 7 },
    { label: "Last 14 Days", value: 14 },
    { label: "Last 30 Days", value: 30 },
    { label: "Last 90 Days", value: 90 },
  ];

  const chartData = useMemo(() => {
    if (!data?.dailyBreakdown) return [];
    return data.dailyBreakdown.map((item: DailyBreakdownItem) => ({
      ...item,
      "Total Visits": item.visits,
      "Unique Visitors": item.uniqueVisitors,
    }));
  }, [data]);

  return (
    <div className="space-y-8 fade-up" data-testid="admin-analytics-view">
      {/* Header Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="display-font text-2xl font-bold tracking-[-.03em] sm:text-3xl">
            Visitor Analytics & Trends
          </h2>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] sm:text-sm">
            Monitor daily traffic, student engagement patterns, top sections, and device types.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-xs">
            {dayOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedDays(opt.value)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                  selectedDays === opt.value
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-xs"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
                data-testid={`button-analytics-days-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/.6)] disabled:opacity-50"
            title="Refresh analytics data"
            data-testid="button-refresh-analytics"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)]"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.3)]" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex items-center justify-between rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.1)] p-5 text-sm text-[hsl(var(--destructive))]">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} />
            <span>Could not load analytics metrics. Please verify database connectivity.</span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl bg-[hsl(var(--destructive))] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
          >
            Retry
          </button>
        </div>
      )}

      {/* Data Loaded */}
      {!isLoading && data && (
        <>
          {/* Key Metric Cards (KPIs) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Today's Visits */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">
                  Today&apos;s Visits
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">
                  <TrendingUp size={18} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="display-font text-3xl font-extrabold tracking-tight">
                  {data.todayVisits.toLocaleString()}
                </span>
                {data.yesterdayVisits > 0 ? (
                  <span
                    className={`inline-flex items-center text-xs font-semibold ${
                      data.todayGrowth >= 0
                        ? "text-emerald-500"
                        : "text-[hsl(var(--destructive))]"
                    }`}
                  >
                    {data.todayGrowth >= 0 ? (
                      <ArrowUpRight size={13} />
                    ) : (
                      <ArrowDownRight size={13} />
                    )}
                    {Math.abs(data.todayGrowth)}% vs y&apos;day
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                    Yesterday: {data.yesterdayVisits}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                Logged since 12:00 AM IST today
              </p>
            </div>

            {/* Today's Unique Visitors */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">
                  Unique Visitors Today
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--secondary)/.1)] text-[hsl(var(--secondary))]">
                  <Users size={18} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="display-font text-3xl font-extrabold tracking-tight">
                  {data.todayUniqueVisitors.toLocaleString()}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))] font-medium">
                  students
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                Distinct browsers / sessions today
              </p>
            </div>

            {/* Daily Average in Period */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">
                  Avg. Visits / Day
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--accent)/.1)] text-[hsl(var(--accent-foreground))]">
                  <Calendar size={18} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="display-font text-3xl font-extrabold tracking-tight">
                  {data.avgVisitsPerDay.toLocaleString()}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))] font-medium">
                  per day
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                Over the past {selectedDays} days
              </p>
            </div>

            {/* All-Time Visits */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-xs transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">
                  Total All-Time Visits
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                  <Eye size={18} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="display-font text-3xl font-extrabold tracking-tight">
                  {data.totalVisits.toLocaleString()}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))] font-medium">
                  all-time
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                Verified public counter tally
              </p>
            </div>
          </div>

          {/* Daily Visits Interactive Area Chart */}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6 shadow-xs">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
                  Daily Traffic Trends ({selectedDays} Days)
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Daily visits vs unique student visitors per day.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-[hsl(var(--primary))]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary))]" />
                  Total Visits
                </span>
                <span className="flex items-center gap-1.5 text-[hsl(var(--secondary))]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--secondary))]" />
                  Unique Visitors
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                    <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--secondary))"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--secondary))"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                    opacity={0.6}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<DailyChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Total Visits"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorVisits)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Unique Visitors"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUnique)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Grid: Top Pages & Device Distribution */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Visited Pages & Sections */}
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
                    Top Visited Sections
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Where students spend their time in Nexora
                  </p>
                </div>
                <BarChart3 size={18} className="text-[hsl(var(--muted-foreground))]" />
              </div>

              {data.topPaths.length === 0 ? (
                <div className="py-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
                  No section views recorded yet. As students visit, popularity bars will appear.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {data.topPaths.map((item) => (
                    <div key={item.path} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="truncate pr-2 text-[hsl(var(--foreground))]">
                          {item.label}
                        </span>
                        <span className="shrink-0 text-[hsl(var(--muted-foreground))] font-normal">
                          {item.count.toLocaleString()} visits ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--muted)/.6)]">
                        <div
                          className="h-full rounded-full bg-[hsl(var(--primary))]"
                          style={{
                            width: `${Math.max(item.percentage, 4)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Device Breakdown & Referrers */}
            <div className="space-y-6">
              {/* Device Types */}
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6 shadow-xs">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
                      Device Breakdown
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Students on Mobile vs Desktop vs Tablet
                    </p>
                  </div>
                  <Smartphone size={18} className="text-[hsl(var(--muted-foreground))]" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {["Mobile", "Desktop", "Tablet"].map((deviceType) => {
                    const found = data.deviceBreakdown.find(
                      (d) => d.device.toLowerCase() === deviceType.toLowerCase(),
                    );
                    const pct = found ? found.percentage : 0;
                    const count = found ? found.count : 0;

                    return (
                      <div
                        key={deviceType}
                        className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] p-3.5 text-center"
                      >
                        <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                          {deviceType === "Mobile" && <Smartphone size={16} />}
                          {deviceType === "Desktop" && <Laptop size={16} />}
                          {deviceType === "Tablet" && <Tablet size={16} />}
                        </div>
                        <div className="display-font text-lg font-bold">{pct}%</div>
                        <div className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                          {deviceType}
                        </div>
                        <div className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground)/.7)]">
                          {count} visits
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Referrers */}
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6 shadow-xs">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
                      Traffic Sources / Referrers
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      How students discover and access Nexora
                    </p>
                  </div>
                  <Globe size={18} className="text-[hsl(var(--muted-foreground))]" />
                </div>

                {data.topReferrers.length === 0 ? (
                  <div className="py-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
                    Direct visits / bookmarks
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {data.topReferrers.map((ref) => (
                      <div
                        key={ref.referrer}
                        className="flex items-center justify-between rounded-xl border border-[hsl(var(--border)/.6)] bg-[hsl(var(--card)/.4)] px-3 py-2 text-xs"
                      >
                        <span className="font-semibold text-[hsl(var(--foreground))]">
                          {ref.referrer}
                        </span>
                        <span className="text-[hsl(var(--muted-foreground))]">
                          {ref.count} visits ({ref.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hourly Peak Activity Heatmap */}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
                  Peak Activity Hours (24-Hour Distribution, IST)
                </h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Identify what time of day students study and download materials most.
                </p>
              </div>
              <Clock3 size={18} className="text-[hsl(var(--muted-foreground))]" />
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.hourlyBreakdown}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                    opacity={0.6}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(val: number) => [
                      `${val} visits`,
                      "Activity",
                    ]}
                    labelFormatter={(label: string) => `Time: ${label}`}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
