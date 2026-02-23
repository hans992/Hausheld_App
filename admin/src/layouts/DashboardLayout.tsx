import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Calendar, Users, Building2, CreditCard, LayoutDashboard, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAuthToken } from "@/lib/api";

const nav = [
  { to: "/admin", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/calendar", end: false, label: "Calendar", icon: Calendar },
  { to: "/admin/workers", end: false, label: "Workers", icon: Users },
  { to: "/admin/clients", end: false, label: "Clients", icon: Building2 },
  { to: "/admin/billing", end: false, label: "Billing", icon: CreditCard },
  { to: "/admin/audit", end: false, label: "Audit Log", icon: FileText },
];

export function DashboardLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(!!getAuthToken());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!hasToken) navigate("/admin/login", { replace: true });
  }, [ready, hasToken, navigate]);

  if (!ready || !hasToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Link to="/admin" className="font-semibold text-primary">
            Hausheld Admin
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {nav.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
