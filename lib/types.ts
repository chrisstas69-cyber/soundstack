export const CATEGORIES = [
  "VST Plugins",
  "Free Synth Presets",
  "Underground Sample Packs",
] as const;

export type DealCategory = (typeof CATEGORIES)[number];

export type DealCurrency = "USD" | "EUR" | "GBP";

/**
 * How the numeric price should be read.
 * - list: verified shelf price, not a markdown
 * - sale: vendor published both a current price and a compare-at price
 * - free: vendor published the item as free
 * - omitted: no numeric price could be verified
 */
export type PriceStatus = "list" | "sale" | "free" | "omitted";

/**
 * One row in data/deals.json.
 * A daily job can append objects with this shape. Dates are YYYY-MM-DD.
 * currency, priceStatus, and priceNote are optional extras so a script can
 * say where a number came from without inventing a discount.
 */
export type Deal = {
  id: string;
  title: string;
  vendor: string;
  category: DealCategory;
  url: string;
  price: number | null;
  originalPrice: number | null;
  discount: string | null;
  isFree: boolean;
  tags: string[];
  addedAt: string;
  expiresAt: string | null;
  featured: boolean;
  featuredUntil: string | null;
  currency?: DealCurrency | null;
  priceStatus?: PriceStatus;
  priceNote?: string;
};
