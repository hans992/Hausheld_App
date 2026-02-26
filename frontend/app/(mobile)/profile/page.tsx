"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, LogOut, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { clearAuthToken, getAuthToken, getMe } from "@/lib/api";

export default function ProfilePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);
  const [me, setMe] = useState<{ id: number; email: string; name: string; role: string } | null>(null);

  useEffect(() => {
    setHasToken(!!getAuthToken());
  }, []);

  useEffect(() => {
    if (!hasToken) return;
    getMe()
      .then(setMe)
      .catch(() => setMe(null));
  }, [hasToken]);

  function handleLogout() {
    clearAuthToken();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <User className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("profile.title")}</h1>
          <p className="text-muted-foreground">{t("profile.subtitle")}</p>
        </div>
      </div>

      {hasToken && me && (
        <Card>
          <CardHeader>
            <CardTitle>{me.name}</CardTitle>
            <CardDescription>{me.email}</CardDescription>
            <p className="text-sm text-muted-foreground">
              {t("profile.role")}: {me.role}
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="lg" asChild>
                <Link href="/settings">
                  <Settings className="h-5 w-5 mr-2" aria-hidden />
                  {t("profile.settings")}
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.login")}</CardTitle>
          <CardDescription>
            {t("profile.loginDescription")}
          </CardDescription>
        </CardHeader>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>{t("profile.demoLogin")}</CardTitle>
            <CardDescription>
              {t("profile.demoLoginDescription")}
            </CardDescription>
            <div className="mt-2 flex gap-2">
              <Button size="lg" asChild>
                <Link href="/login">{t("profile.goToLogin")}</Link>
              </Button>
              {hasToken && (
                <Button size="lg" variant="outline" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" aria-hidden />
                  {t("profile.logout")}
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>
      </Card>
    </div>
  );
}
