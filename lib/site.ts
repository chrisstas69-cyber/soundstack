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

export const FREE_HEADER_LABEL = "Get Your Plugin Featured (Free)";

export const FREE_ADVERTISE_PATH = "/advertise";

export type SponsorMode = "free" | "paid";

export type SponsorCheckoutLink = {
  href: string;
  label: string;
};

/**
 * `free` when unset or set to anything other than `paid`.
 * `NEXT_PUBLIC_` values are inlined at build time.
 */
export function sponsorModeFrom(value: string | null | undefined): SponsorMode {
  return value?.trim().toLowerCase() === "paid" ? "paid" : "free";
}

export function sponsorMode(): SponsorMode {
  return sponsorModeFrom(process.env.NEXT_PUBLIC_SPONSOR_MODE);
}

/** $79 founding checkout. First 5 sponsors, 7 days. */
export function foundingCheckoutHref(): string | null {
  return httpsLink(process.env.NEXT_PUBLIC_STRIPE_FOUNDING_LINK);
}

/** $149 checkout. 7 days. */
export function fullCheckoutHref(): string | null {
  return httpsLink(process.env.NEXT_PUBLIC_STRIPE_FULL_LINK);
}

/**
 * Header CTA. Free mode always links to /advertise.
 * Paid mode keeps the founding link, then the $149 link.
 * `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` is only used when neither paid link is set.
 */
export function headerSponsorCta(): SponsorCheckoutLink | null {
  return headerSponsorCtaForMode(sponsorMode(), {
    founding: process.env.NEXT_PUBLIC_STRIPE_FOUNDING_LINK,
    full: process.env.NEXT_PUBLIC_STRIPE_FULL_LINK,
    payment: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK,
  });
}

export function headerSponsorCtaForMode(
  mode: SponsorMode,
  links: {
    founding?: string | null;
    full?: string | null;
    payment?: string | null;
  },
): SponsorCheckoutLink | null {
  if (mode === "free") {
    return { href: FREE_ADVERTISE_PATH, label: FREE_HEADER_LABEL };
  }
  return headerSponsorCtaFromLinks(links);
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
