import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import de from "@/locales/de.json";

const LOCALE_STORAGE_KEY = "hausheld_locale";

export function getStoredLocale(): string {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem(LOCALE_STORAGE_KEY) ?? "en";
}

export function setStoredLocale(locale: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, de: { translation: de } },
  lng: getStoredLocale(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
