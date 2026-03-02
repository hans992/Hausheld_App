export type HslTokenValue = string;

export type DesignTokens = {
  background: HslTokenValue;
  foreground: HslTokenValue;
  card: HslTokenValue;
  cardForeground: HslTokenValue;
  primary: HslTokenValue;
  primaryForeground: HslTokenValue;
  secondary: HslTokenValue;
  secondaryForeground: HslTokenValue;
  muted: HslTokenValue;
  mutedForeground: HslTokenValue;
  accent: HslTokenValue;
  accentForeground: HslTokenValue;
  destructive: HslTokenValue;
  destructiveForeground: HslTokenValue;
  border: HslTokenValue;
  input: HslTokenValue;
  ring: HslTokenValue;
  radiusCard: string;
  shadowSoft: string;
  brandGold: HslTokenValue;
};

/**
 * Premium default: engineered dark with restrained cyan accents.
 * Values are stored as "H S% L%" (optionally with "/ alpha") so they can be used as `hsl(var(--token))`.
 */
export const premiumDarkTokens: DesignTokens = {
  background: "222.2 84% 4.9%",
  foreground: "210 40% 96%",
  card: "222.2 47.4% 11.2% / 0.60",
  cardForeground: "210 40% 96%",
  primary: "188 95% 41%",
  primaryForeground: "222.2 84% 4.9%",
  secondary: "217.2 32.6% 17.5%",
  secondaryForeground: "210 40% 96%",
  muted: "217.2 32.6% 17.5% / 0.80",
  mutedForeground: "215 20.2% 70%",
  accent: "188 60% 16%",
  accentForeground: "210 40% 96%",
  destructive: "0 62.8% 30.6%",
  destructiveForeground: "210 40% 96%",
  border: "217.2 32.6% 17.5% / 0.90",
  input: "217.2 32.6% 17.5% / 0.70",
  ring: "188 95% 41%",
  radiusCard: "1rem",
  shadowSoft: "0 0 0 0 rgb(0 0 0 / 0)",
  brandGold: "43 96% 56%",
};

/**
 * Optional light mode (kept for later): clean, matte, low-chroma.
 */
export const premiumLightTokens: DesignTokens = {
  background: "30 20% 98%",
  foreground: "222.2 30% 12%",
  card: "0 0% 100% / 0.85",
  cardForeground: "222.2 30% 12%",
  primary: "188 95% 35%",
  primaryForeground: "0 0% 100%",
  secondary: "200 20% 94%",
  secondaryForeground: "222.2 30% 12%",
  muted: "200 18% 94%",
  mutedForeground: "215.4 16.3% 46.9%",
  accent: "199 40% 92%",
  accentForeground: "188 95% 30%",
  destructive: "0 84.2% 60.2%",
  destructiveForeground: "210 40% 98%",
  border: "214 25% 90%",
  input: "214 25% 90%",
  ring: "188 95% 35%",
  radiusCard: "1rem",
  shadowSoft: "0 0 0 0 rgb(0 0 0 / 0)",
  brandGold: "43 96% 50%",
};

