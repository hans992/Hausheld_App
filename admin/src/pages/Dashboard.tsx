import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Users, Building2, CreditCard, FileText, AlertTriangle, UserX, Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getShifts, getWorkers, getClients, getBudgetAlerts, runSeedDemo } from "@/lib/api";

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

export function Dashboard() {
  const [stats, setStats] = useState<{
    workersCount: number;
    clientsCount: number;
    unassignedThisWeek: number;
    budgetAlertsCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seedLoading, setSeedLoading] = useState(false);

  const loadStats = useCallback(() => {
    const month = currentMonth();
    return Promise.all([getWorkers(), getClients(), getShifts(), getBudgetAlerts(month)])
      .then(([workers, clients, shifts, alerts]) => {
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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Command center for Hausheld administration.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span>Loading stats…</span>
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
                  No data yet
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Load demo workers, clients, and shifts to explore the dashboard. You can also run the backend seed script (see README).
                </p>
                <Button
                  className="mt-2"
                  size="sm"
                  onClick={handleLoadDemoData}
                  disabled={seedLoading}
                >
                  {seedLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Database className="h-4 w-4" aria-hidden />}
                  Load demo data
                </Button>
              </CardHeader>
            </Card>
          )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/admin/workers">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Workers</CardTitle>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Clients</CardTitle>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned (this week)</CardTitle>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Budget alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.budgetAlertsCount}</p>
                <p className="text-xs text-muted-foreground">below 15% this month</p>
              </CardContent>
            </Card>
          </Link>
        </div>
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
                  Open
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
