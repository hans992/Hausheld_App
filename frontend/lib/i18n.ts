import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import de from "@/messages/de.json";
import en from "@/messages/en.json";

const LOCALE_STORAGE_KEY = "hausheld_locale";

export function getStoredLocale(): string {
  if (typeof window === "undefined") return "de";
  return localStorage.getItem(LOCALE_STORAGE_KEY) ?? "de";
}

export function setStoredLocale(locale: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function initI18n() {
  if (typeof window === "undefined" || i18n.isInitialized) return;
  i18n.use(initReactI18next).init({
    resources: { de: { translation: de }, en: { translation: en } },
    lng: getStoredLocale(),
    fallbackLng: "de",
    interpolation: { escapeValue: false },
  });
}

// Initialize on client when this module loads (e.g. from I18nProvider)
if (typeof window !== "undefined") {
  initI18n();
}

export default i18n;
