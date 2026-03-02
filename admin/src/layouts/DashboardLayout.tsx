import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Calendar, Users, Building2, CreditCard, LayoutDashboard, FileText, Loader2, LogOut, User, Settings, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { clearAuthToken, getAuthToken } from "@/lib/api";

const nav = [
  { to: "/admin", end: true, labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/admin/calendar", end: false, labelKey: "nav.calendar", icon: Calendar },
  { to: "/admin/workers", end: false, labelKey: "nav.workers", icon: Users },
  { to: "/admin/clients", end: false, labelKey: "nav.clients", icon: Building2 },
  { to: "/admin/map", end: false, labelKey: "nav.map", icon: MapPin },
  { to: "/admin/billing", end: false, labelKey: "nav.billing", icon: CreditCard },
  { to: "/admin/audit", end: false, labelKey: "nav.audit", icon: FileText },
  { to: "/admin/profile", end: false, labelKey: "nav.profile", icon: User },
  { to: "/admin/settings", end: false, labelKey: "nav.settings", icon: Settings },
];

export function DashboardLayout() {
  const { t } = useTranslation();
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

  function handleLogout() {
    clearAuthToken();
    navigate("/admin/login", { replace: true });
  }

  if (!ready || !hasToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 flex-col border-r border-border/80 bg-card bg-gradient-to-b from-card to-muted/30">
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <Link to="/admin" className="flex items-center gap-2 font-semibold text-primary">
            <span className="rounded-lg bg-white/95 p-1.5 shadow-soft ring-1 ring-black/5">
              <img
                src="/logo_hausheld.png"
                alt=""
                className="h-8 w-auto object-contain"
                aria-hidden
              />
            </span>
            <span>Hausheld Admin</span>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {nav.map(({ to, end, labelKey, icon: Icon }) => (
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
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-5 w-5 shrink-0" aria-hidden />
            {t("nav.logout")}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
