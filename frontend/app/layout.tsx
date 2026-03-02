import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { I18nProvider } from "./I18nProvider";
import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/inter-tight/700.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";
import "@fontsource/geist-mono/600.css";
import "@fontsource/geist-mono/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hausheld – My Schedule",
  description: "Home-help worker app: schedule, clients, check-in/out.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Hausheld",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-screen">
        <I18nProvider>
          {children}
        </I18nProvider>
        <Toaster richColors position="top-center" closeButton />
      </body>
    </html>
  );
}
