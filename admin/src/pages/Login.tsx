import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, User, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { devLogin, setAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DEMO_EMAILS = {
  admin: "admin@demo.com",
  worker: "worker-essen@demo.com",
} as const;

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<"admin" | "worker" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = async (role: "admin" | "worker") => {
    const email = role === "admin" ? DEMO_EMAILS.admin : DEMO_EMAILS.worker;
    setLoading(role);
    setError(null);
    try {
      const res = await devLogin(email);
      setAuthToken(res.access_token);
      toast.success(role === "admin" ? t("login.loggedInAdmin") : t("login.loggedInWorker"));
      navigate("/admin", { replace: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : t("login.loginFailed");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-lg bg-white/95 px-4 py-3 shadow-soft ring-1 ring-black/5">
            <img
              src="/logo-hausheld-ki.png"
              alt="Hausheld KI"
              className="h-14 w-auto max-w-[200px] object-contain"
            />
          </div>
          <h1 className="mt-4 text-2xl font-bold">{t("login.title")}</h1>
          <p className="text-muted-foreground">{t("login.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("login.cardTitle")}</CardTitle>
            <CardDescription>
              {t("login.cardDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                {error}
              </div>
            )}
            <Button
              className="w-full"
              size="lg"
              onClick={() => handleDemoLogin("admin")}
              disabled={loading !== null}
            >
              {loading === "admin" ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <Shield className="h-5 w-5" aria-hidden />
              )}
              {t("login.demoAdmin")}
            </Button>
            <Button
              className="w-full"
              size="lg"
              variant="secondary"
              onClick={() => handleDemoLogin("worker")}
              disabled={loading !== null}
            >
              {loading === "worker" ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <User className="h-5 w-5" aria-hidden />
              )}
              {t("login.demoWorker")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
