import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setStoredLocale } from "@/i18n";
import { Select } from "@/components/ui/select";

export function Settings() {
  const { t, i18n } = useTranslation();

  function handleLanguageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const locale = e.target.value as "en" | "de";
    setStoredLocale(locale);
    i18n.changeLanguage(locale);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
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
            className="w-[220px]"
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
