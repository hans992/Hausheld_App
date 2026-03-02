"use client";

import { useEffect } from "react";
import { getStoredTheme, applyTheme } from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    const m = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => applyTheme(getStoredTheme());
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);

  return <>{children}</>;
}
