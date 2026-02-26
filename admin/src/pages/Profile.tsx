import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, LogOut, Settings, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clearAuthToken, getMe } from "@/lib/api";

export function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [me, setMe] = useState<{ id: number; email: string; name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  function handleLogout() {
    clearAuthToken();
    navigate("/admin/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("profile.title")}</h1>
        <p className="text-destructive">{error ?? t("profile.failed")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("profile.title")}</h1>
        <p className="text-muted-foreground">{t("profile.subtitle")}</p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <div>
              <CardTitle>{me.name}</CardTitle>
              <CardDescription>{me.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">{t("profile.role")}</dt>
              <dd className="font-medium">{me.role}</dd>
            </div>
          </dl>
          <div className="flex gap-2">
            <Link
              to="/admin/settings"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2 font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Settings className="h-4 w-4" aria-hidden />
              {t("profile.settings")}
            </Link>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" aria-hidden />
              {t("profile.logout")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
