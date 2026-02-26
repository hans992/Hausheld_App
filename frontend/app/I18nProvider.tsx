"use client";

import { useEffect } from "react";
import { initI18n } from "@/lib/i18n";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initI18n();
  }, []);
  return <>{children}</>;
}
