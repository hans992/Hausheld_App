"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Calendar, Users, User, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getAuthToken } from "@/lib/api";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/schedule", labelKey: "nav.schedule", icon: Calendar },
  { href: "/clients", labelKey: "nav.clients", icon: Users },
  { href: "/profile", labelKey: "nav.profile", icon: User },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    const token = getAuthToken();
    if (!token && pathname !== "/login") {
      router.replace("/login");
    }
  }, [pathname, router]);

  const token = typeof window !== "undefined" ? getAuthToken() : null;
  if (!token && pathname !== "/login") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t("common.redirecting")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <header className="sticky top-0 z-40 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/schedule" className="flex items-center justify-center">
          <span className="rounded-lg bg-white/95 px-3 py-2 shadow-soft ring-1 ring-black/5">
            <img
              src="/logo_hausheld.png"
              alt="Hausheld KI"
              className="h-9 w-auto max-w-[160px] object-contain"
            />
          </span>
        </Link>
      </header>
      <main className="flex-1 p-4">{children}</main>

      {/* Bottom navigation – large touch targets */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
      >
        <div className="flex h-16 min-h-touch items-center justify-around">
          {navItems.map(({ href, labelKey, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-touch min-w-touch flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-3 text-sm font-medium transition-colors touch-manipulation",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-6 w-6" aria-hidden />
                <span>{t(labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
