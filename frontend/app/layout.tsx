import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { CookieBanner } from "@/components/CookieBanner";
import { I18nProvider } from "./I18nProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
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

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('hausheld-theme');
    var light = t === 'light' || (t !== 'dark' && window.matchMedia('(prefers-color-scheme: light)').matches);
    document.documentElement.classList.toggle('light', !!light);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        {/* Animated background — fixed, behind all content */}
        <div
          className="fixed inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"
          aria-hidden
        >
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-brand/50 blur-2xl" />
        </div>

        <ThemeProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </ThemeProvider>
        <Toaster richColors position="top-center" closeButton />
        <CookieBanner />
      </body>
    </html>
  );
}
