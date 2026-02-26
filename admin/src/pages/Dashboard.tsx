import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Users, Building2, CreditCard, FileText, AlertTriangle, UserX, Loader2, Database, Euro } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getShifts, getWorkers, getClients, getBudgetAlerts, getDashboardSummary, runSeedDemo } from "@/lib/api";
import type { Shift } from "@/lib/api";
import type { Worker } from "@/lib/api";
import type { BudgetStatusResponse } from "@/lib/api";
import type { DashboardSummary } from "@/lib/api";
import { useTranslation } from "react-i18next";

const links = [
  { to: "/admin/calendar", label: "Calendar", icon: Calendar, desc: "View and manage shifts" },
  { to: "/admin/workers", label: "Workers", icon: Users, desc: "Workers and sick leave" },
  { to: "/admin/clients", label: "Clients", icon: Building2, desc: "Clients and budget alerts" },
  { to: "/admin/billing", label: "Billing", icon: CreditCard, desc: "SGB XI CSV export" },
  { to: "/admin/audit", label: "Audit Log", icon: FileText, desc: "Who did what, when" },
];

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isThisWeek(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return date >= weekStart && date <= weekEnd;
}

function getWeekKey(iso: string): string {
  const d = new Date(iso);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
  return start.toISOString().slice(0, 10);
}

function buildShiftsByWeekData(shifts: Shift[]): { week: string; count: number }[] {
  const now = new Date();
  const weeks: { week: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay() - 7 * i + (now.getDay() === 0 ? -6 : 1));
    const key = d.toISOString().slice(0, 10);
    weeks.push({ week: key, count: 0 });
  }
  const keyToIndex = Object.fromEntries(weeks.map((w, i) => [w.week, i]));
  shifts.forEach((s) => {
    const k = getWeekKey(s.start_time);
    if (keyToIndex[k] !== undefined) weeks[keyToIndex[k]].count += 1;
  });
  return weeks.map((w) => ({ ...w, week: w.week.slice(0, 7) }));
}

function buildStatusData(shifts: Shift[]): { name: string; value: number; fill: string }[] {
  const counts: Record<string, number> = {};
  shifts.forEach((s) => {
    counts[s.status] = (counts[s.status] ?? 0) + 1;
  });
  const COLORS = ["#64748b", "#4f46e5", "#f43f5e", "#eab308"]; // slate, indigo, rose, amber
  return Object.entries(counts).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
}

function buildBudgetChartData(
  alerts: BudgetStatusResponse[],
  clients: { id: number; name: string }[]
): { name: string; usedPercent: number }[] {
  return alerts.slice(0, 8).map((a) => {
    const budget = parseFloat(a.monthly_budget) || 1;
    const deducted = parseFloat(a.total_deducted) || 0;
    const name = clients.find((c) => c.id === a.client_id)?.name ?? `Client ${a.client_id}`;
    return { name: name.length > 20 ? name.slice(0, 17) + "…" : name, usedPercent: Math.round((deducted / budget) * 100) };
  });
}

function buildWorkersActivityData(shifts: Shift[], workers: Worker[]): { name: string; count: number }[] {
  const month = currentMonth();
  const completed = shifts.filter(
    (s) => s.status === "Completed" && s.start_time.startsWith(month)
  );
  const byWorker: Record<number, number> = {};
  completed.forEach((s) => {
    if (s.worker_id != null) byWorker[s.worker_id] = (byWorker[s.worker_id] ?? 0) + 1;
  });
  return Object.entries(byWorker).map(([wid, count]) => {
    const w = workers.find((w) => w.id === Number(wid));
    return { name: w?.name ?? `Worker ${wid}`, count };
  });
}

export function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<{
    workersCount: number;
    clientsCount: number;
    unassignedThisWeek: number;
    budgetAlertsCount: number;
  } | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [shiftsList, setShiftsList] = useState<Shift[]>([]);
  const [workersList, setWorkersList] = useState<Worker[]>([]);
  const [clientsList, setClientsList] = useState<{ id: number; name: string }[]>([]);
  const [budgetAlertsList, setBudgetAlertsList] = useState<BudgetStatusResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);

  const loadStats = useCallback(() => {
    const month = currentMonth();
    return Promise.all([getWorkers(), getClients(), getShifts(), getBudgetAlerts(month), getDashboardSummary()])
      .then(([workers, clients, shifts, alerts, s]) => {
        setWorkersList(workers);
        setClientsList(clients.map((c) => ({ id: c.id, name: c.name })));
        setShiftsList(shifts);
        setBudgetAlertsList(alerts);
        setSummary(s);
        const unassignedThisWeek = shifts.filter(
          (s) => s.status === "Unassigned" && isThisWeek(s.start_time)
        ).length;
        setStats({
          workersCount: workers.length,
          clientsCount: clients.length,
          unassignedThisWeek,
          budgetAlertsCount: alerts.length,
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    loadStats();
  }, [loadStats]);

  async function handleLoadDemoData() {
    setSeedLoading(true);
    try {
      const res = await runSeedDemo();
      toast.success(res.message ?? "Demo data loaded.");
      setLoading(true);
      await loadStats();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load demo data");
    } finally {
      setSeedLoading(false);
    }
  }

  const isEmpty = stats && stats.workersCount === 0 && stats.clientsCount === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span>{t("dashboard.loading")}</span>
        </div>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : stats ? (
        <>
          {isEmpty && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-5 w-5 text-primary" aria-hidden />
                  {t("dashboard.noData")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.noDataHint")}
                </p>
                <Button
                  className="mt-2"
                  size="sm"
                  onClick={handleLoadDemoData}
                  disabled={seedLoading}
                >
                  {seedLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Database className="h-4 w-4" aria-hidden />}
                  {t("dashboard.loadDemo")}
                </Button>
              </CardHeader>
            </Card>
          )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/admin/workers">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.workers")}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.workersCount}</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/clients">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.clients")}</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.clientsCount}</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/calendar">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.unassigned")}</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" aria-hidden />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.unassignedThisWeek}</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/admin/clients">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t("dashboard.budgetAlerts")}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.budgetAlertsCount}</p>
                <p className="text-xs text-muted-foreground">{t("dashboard.budgetAlertsHint")}</p>
              </CardContent>
            </Card>
          </Link>
        </div>
        {/* Stats from dashboard-summary API: KPIs + charts */}
        {summary && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="transition-colors hover:bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Active Workers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{summary.total_active_workers}</p>
                </CardContent>
              </Card>
              <Card className="transition-colors hover:bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{summary.total_clients}</p>
                </CardContent>
              </Card>
              <Card className="transition-colors hover:bg-muted/30">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
                  <Euro className="h-4 w-4 text-muted-foreground" aria-hidden />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">€{summary.monthly_revenue.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="transition-colors hover:bg-muted/30 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Weekly Shift Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={(summary.weekly_shift_trends ?? []).map((d) => ({
                          ...d,
                          shortDate: new Date(d.date).toLocaleDateString("de-DE", { weekday: "short", day: "numeric" }),
                        }))}
                        margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="summaryTrendGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis dataKey="shortDate" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis
                          domain={[0, Math.max(1, ...(summary.weekly_shift_trends ?? []).map((d) => d.count))]}
                          allowDecimals={false}
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={28}
                        />
                        <Tooltip
                          formatter={(value: unknown) => [Array.isArray(value) ? value[0] : value, "Shifts"]}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                          contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#summaryTrendGradient)"
                          isAnimationActive
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="transition-colors hover:bg-muted/30 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">City Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summary.city_distribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={2}
                          label={({ name, value }) => (value > 0 ? `${name}: ${value}` : null)}
                        >
                          {summary.city_distribution.map((_, index) => (
                            <Cell
                              key={`cell-summary-${index}`}
                              fill={["#64748b", "#4f46e5", "#f43f5e"][index % 3]}
                              stroke="hsl(var(--card))"
                              strokeWidth={1.5}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: unknown) => [Array.isArray(value) ? value[0] : value, ""]}
                          contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        />
                        <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="transition-colors hover:bg-muted/30 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Top 5 Workers (Completed Shifts)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(summary.top_workers_completed_shifts ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No completed shifts this month.</p>
                    ) : (
                      (summary.top_workers_completed_shifts ?? []).map((w) => {
                        const topWorkers = summary.top_workers_completed_shifts ?? [];
                        const maxVal = Math.max(1, ...topWorkers.map((x) => x.value));
                        const pct = (w.value / maxVal) * 100;
                        return (
                          <div key={w.name} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium truncate">{w.name}</span>
                              <span className="text-muted-foreground tabular-nums">{w.value}</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
        {shiftsList.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight">{t("dashboard.analytics")}</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="transition-colors hover:bg-muted/30 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">{t("dashboard.shiftsPerWeek")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={buildShiftsByWeekData(shiftsList)}
                        margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="analyticsWeekGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                        <Tooltip
                          formatter={(value: unknown) => [Array.isArray(value) ? value[0] : value, t("dashboard.shiftsPerWeek")]}
                          contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#analyticsWeekGradient)"
                          isAnimationActive
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="transition-colors hover:bg-muted/30 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">{t("dashboard.shiftStatus")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={buildStatusData(shiftsList)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={72}
                          paddingAngle={3}
                          label={false}
                        >
                          {buildStatusData(shiftsList).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="hsl(var(--card))" strokeWidth={1.5} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: unknown) => [Array.isArray(value) ? value[0] : value, ""]}
                          contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                        />
                        <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              {budgetAlertsList.length > 0 && (
                <Card className="transition-colors hover:bg-muted/30 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">{t("dashboard.budgetUsed")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={buildBudgetChartData(budgetAlertsList, clientsList)}
                          layout="vertical"
                          margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                        >
                          <defs>
                            <linearGradient id="budgetBarGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.9} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            formatter={(value: unknown) => [`${Number(Array.isArray(value) ? value[0] : value)}%`, "Used"]}
                            contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                          />
                          <Bar dataKey="usedPercent" fill="url(#budgetBarGradient)" radius={[0, 4, 4, 0]} maxBarSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
              {workersList.length > 0 && (() => {
                const activity = buildWorkersActivityData(shiftsList, workersList);
                if (activity.length === 0) return null;
                return (
                  <Card className="transition-colors hover:bg-muted/30 overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium">{t("dashboard.completedByWorker")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={activity}
                            margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="workerBarGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                            <Tooltip
                              formatter={(value: unknown) => [Array.isArray(value) ? value[0] : value, ""]}
                              contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                            />
                            <Bar dataKey="count" fill="url(#workerBarGradient)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </div>
        )}
        </>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {links.map(({ to, label, icon: Icon, desc }) => (
          <Card key={to}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{desc}</p>
              <Link to={to}>
                <Button variant="secondary" size="sm" className="mt-4">
                  {t("common.open")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
