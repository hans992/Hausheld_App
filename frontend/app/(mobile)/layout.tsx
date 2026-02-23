"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Users, User } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
];

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <main className="flex-1 p-4">{children}</main>

      {/* Bottom navigation – large touch targets */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
      >
        <div className="flex h-16 min-h-touch items-center justify-around">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex min-h-touch min-w-touch flex-col items-center justify-center gap-0.5 rounded-lg px-4 py-3 text-sm font-medium transition-colors touch-manipulation",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-6 w-6" aria-hidden />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
