export const siteName = "SoundStack";

export const siteDescription =
  "Curated deal radar for music producers: daily audio plugin sales, free synth presets, and boutique soundware.";

const FALLBACK_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return FALLBACK_SITE_URL;

  try {
    return new URL(value).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}
