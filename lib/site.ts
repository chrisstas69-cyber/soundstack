export const siteName = "SoundStack";

/** Public origin used for metadata, sitemap, and JSON-LD. No trailing slash. */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://soundstack.vercel.app"
).replace(/\/$/, "");

export const siteDescription =
  "Curated deal radar for music producers: daily audio plugin sales, free Serum, Vital, and Diva presets, and boutique soundware.";

export const FOUNDING_HEADER_LABEL =
  "Feature Your Plugin ($79 founding, reg. $149)";

export const FULL_HEADER_LABEL = "Feature Your Plugin / Pack ($149)";

export type SponsorCheckoutLink = {
  href: string;
  label: string;
};

/** $79 founding checkout. First 5 sponsors, 7 days. */
export function foundingCheckoutHref(): string | null {
  return httpsLink(process.env.NEXT_PUBLIC_STRIPE_FOUNDING_LINK);
}

/** $149 checkout. 7 days. */
export function fullCheckoutHref(): string | null {
  return httpsLink(process.env.NEXT_PUBLIC_STRIPE_FULL_LINK);
}

/**
 * Header CTA. The founding link wins. Otherwise the $149 link.
 * `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` is only used when neither is set.
 */
export function headerSponsorCta(): SponsorCheckoutLink | null {
  return headerSponsorCtaFromLinks({
    founding: process.env.NEXT_PUBLIC_STRIPE_FOUNDING_LINK,
    full: process.env.NEXT_PUBLIC_STRIPE_FULL_LINK,
    payment: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK,
  });
}

export function headerSponsorCtaFromLinks(links: {
  founding?: string | null;
  full?: string | null;
  payment?: string | null;
}): SponsorCheckoutLink | null {
  const founding = httpsLink(links.founding);
  if (founding) return { href: founding, label: FOUNDING_HEADER_LABEL };

  const full = httpsLink(links.full) ?? httpsLink(links.payment);
  if (!full) return null;
  return { href: full, label: FULL_HEADER_LABEL };
}

export function sponsorHref(): string | null {
  return headerSponsorCta()?.href ?? null;
}

function httpsLink(value: string | null | undefined): string | null {
  const link = value?.trim() ?? "";
  return link.startsWith("https://") ? link : null;
}
