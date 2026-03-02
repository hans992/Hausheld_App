"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { setStoredLocale } from "@/lib/i18n";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();

  function handleLanguageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const locale = e.target.value as "de" | "en";
    setStoredLocale(locale);
    i18n.changeLanguage(locale);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.description")}</p>
      </div>
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
