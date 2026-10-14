export const siteName = "SoundStack";

/** Public origin used for metadata, sitemap, and JSON-LD. No trailing slash. */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://soundstack.vercel.app"
).replace(/\/$/, "");

export const siteDescription =
  "Curated deal radar for music producers: daily audio plugin sales, free Serum, Vital, and Diva presets, and boutique soundware.";

export function sponsorHref(): string | null {
  const link = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK?.trim() ?? "";
  return link.startsWith("https://") ? link : null;
}
