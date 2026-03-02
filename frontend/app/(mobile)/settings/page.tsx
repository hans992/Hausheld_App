"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { setStoredLocale } from "@/lib/i18n";
import { getStoredTheme, setStoredTheme, type Theme } from "@/lib/theme";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  function handleLanguageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const locale = e.target.value as "de" | "en";
    setStoredLocale(locale);
    i18n.changeLanguage(locale);
  }

  function handleThemeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value as Theme;
    setTheme(value);
    setStoredTheme(value);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.description")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.theme")}</CardTitle>
          <CardDescription>{t("settings.themeDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <label htmlFor="theme-select" className="mb-2 block text-sm font-medium">
            {t("settings.themeLabel")}
          </label>
          <Select
            id="theme-select"
            value={theme}
            onChange={handleThemeChange}
            className="max-w-[220px]"
          >
            <option value="light">{t("settings.themeLight")}</option>
            <option value="dark">{t("settings.themeDark")}</option>
            <option value="system">{t("settings.themeSystem")}</option>
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.language")}</CardTitle>
          <CardDescription>{t("settings.languageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <label htmlFor="language-select" className="mb-2 block text-sm font-medium">
            {t("settings.languageLabel")}
          </label>
          <Select
            id="language-select"
            value={i18n.language}
            onChange={handleLanguageChange}
            className="max-w-[220px]"
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </Select>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        <Link href="/profile" className="underline hover:text-foreground">
          ← {t("profile.title")}
        </Link>
      </p>
    </div>
  );
}
