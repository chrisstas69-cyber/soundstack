export const CATEGORIES = [
  "VST Plugins",
  "Free Synth Presets",
  "Underground Sample Packs",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const PRICE_STATUSES = ["verified", "approximate", "unlisted"] as const;

export type PriceStatus = (typeof PRICE_STATUSES)[number];

export const CURRENCIES = ["USD", "EUR", "GBP"] as const;

export type Currency = (typeof CURRENCIES)[number];

/**
 * One listing in data/deals.json.
 * A daily script can append an object with the same keys.
 * Null fields may be omitted; the parser treats a missing key as null.
 */
export type Deal = {
  id: string;
  title: string;
  vendor: string;
  category: Category;
  url: string;
  price: string | null;
  currency: Currency | null;
  originalPrice: string | null;
  discount: string | null;
  priceStatus: PriceStatus;
  priceNote?: string;
  isFree: boolean;
  tags: string[];
  blurb?: string;
  addedAt: string;
  expiresAt: string | null;
  featured: boolean;
  featuredUntil: string | null;
};
