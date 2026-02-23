"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { clearAuthToken, getAuthToken } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    setHasToken(!!getAuthToken());
  }, []);

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
          <h1 className="text-2xl font-bold">Profil</h1>
          <p className="text-muted-foreground">Anmeldung & Einstellungen</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anmeldung</CardTitle>
          <CardDescription>
            Melde dich mit Demo-Login an, um deinen Plan und Klienten zu sehen. Der Administrator erstellt dein Konto.
          </CardDescription>
        </CardHeader>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Demo-Login</CardTitle>
            <CardDescription>
              Auf der Login-Seite kannst du ohne Passwort als Admin oder Mitarbeiter (Demo) einsteigen.
            </CardDescription>
            <div className="mt-2 flex gap-2">
              <Button size="lg" asChild>
                <Link href="/login">Zur Anmeldung</Link>
              </Button>
              {hasToken && (
                <Button size="lg" variant="outline" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" aria-hidden />
                  Abmelden
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>
      </Card>
    </div>
  );
}
