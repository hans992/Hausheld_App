import { useState, useEffect } from "react";
import CookieConsent from "react-cookie-consent";
import { Analytics } from "@vercel/analytics/react";

const COOKIE_NAME = "hausheld-cookie-consent";

function hasConsent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes(`${COOKIE_NAME}=true`);
}

export function CookieBanner() {
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    setConsent(hasConsent());
  }, []);

  return (
    <>
      <CookieConsent
        location="bottom"
        buttonText="Accept"
        declineButtonText="Decline"
        enableDeclineButton
        cookieName={COOKIE_NAME}
        onAccept={() => setConsent(true)}
        style={{
          background: "hsl(var(--card))",
          color: "hsl(var(--card-foreground))",
          borderTop: "1px solid hsl(var(--border))",
          backdropFilter: "blur(12px)",
          alignItems: "center",
          padding: "12px 16px",
          flexWrap: "wrap",
          gap: "12px",
        }}
        buttonStyle={{
          background: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          borderRadius: "0.75rem",
          padding: "10px 20px",
          fontWeight: 600,
        }}
        declineButtonStyle={{
          background: "transparent",
          color: "hsl(var(--muted-foreground))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "0.75rem",
          padding: "10px 20px",
        }}
      >
        We use cookies to analyze and improve your use of the app. By clicking &quot;Accept&quot; you consent to this use.
      </CookieConsent>
      {consent && <Analytics />}
    </>
  );
}
