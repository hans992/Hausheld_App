export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "hausheld-theme";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export function setStoredTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

function resolveEffectiveTheme(theme: Theme): "light" | "dark" {
  if (theme === "light") return "light";
  if (theme === "dark") return "dark";
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const effective = resolveEffectiveTheme(theme);
  document.documentElement.classList.toggle("light", effective === "light");
}
