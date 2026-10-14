import rawDeals from "@/data/deals.json";
import {
  CATEGORIES,
  CURRENCIES,
  PRICE_STATUSES,
  type Category,
  type Currency,
  type Deal,
  type PriceStatus,
} from "@/lib/types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const MONEY = /^\d+(\.\d{1,2})?$/;
const DISCOUNT = /^\d{1,3}%$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(value: unknown, label: string): string | null {
  if (value == null) return null;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a string or null`);
  }
  return value.trim();
}

function parseDate(value: unknown, label: string, required: boolean): string | null {
  if (value == null) {
    if (required) throw new Error(`${label} is required`);
    return null;
  }
  if (typeof value !== "string" || !ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp`);
  }
  return value;
}

function parseMoney(value: unknown, label: string): string | null {
  const amount = optionalString(value, label);
  if (amount && !MONEY.test(amount)) {
    throw new Error(`${label} must be a numeric string such as "249" or "24.99"`);
  }
  return amount;
}

function parseDeal(value: unknown, index: number): Deal {
  if (!isRecord(value)) {
    throw new Error(`Deal at index ${index} must be an object`);
  }

  const id = requireString(value.id, `deals[${index}].id`);
  const label = `deals[${id}]`;

  const category = requireString(value.category, `${label}.category`);
  if (!CATEGORIES.includes(category as Category)) {
    throw new Error(`${label}.category must be one of: ${CATEGORIES.join(", ")}`);
  }

  const url = requireString(value.url, `${label}.url`);
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`${label}.url must be an absolute URL`);
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error(`${label}.url must be http or https`);
  }

  if (!Array.isArray(value.tags) || value.tags.some((tag) => typeof tag !== "string")) {
    throw new Error(`${label}.tags must be an array of strings`);
  }

  if (typeof value.isFree !== "boolean") {
    throw new Error(`${label}.isFree must be a boolean`);
  }
  if (typeof value.featured !== "boolean") {
    throw new Error(`${label}.featured must be a boolean`);
  }

  let currency: Currency | null = null;
  if (value.currency != null) {
    if (typeof value.currency !== "string" || !CURRENCIES.includes(value.currency as Currency)) {
      throw new Error(`${label}.currency must be USD, EUR, GBP, or null`);
    }
    currency = value.currency as Currency;
  }

  let priceStatus: PriceStatus;
  if (value.priceStatus == null) {
    priceStatus = value.price == null ? "unlisted" : "approximate";
  } else if (
    typeof value.priceStatus === "string" &&
    PRICE_STATUSES.includes(value.priceStatus as PriceStatus)
  ) {
    priceStatus = value.priceStatus as PriceStatus;
  } else {
    throw new Error(`${label}.priceStatus must be verified, approximate, or unlisted`);
  }

  const price = parseMoney(value.price, `${label}.price`);
  if (value.isFree && price && price !== "0") {
    throw new Error(`${label} is marked free but has a non-zero price`);
  }

  const discount = optionalString(value.discount, `${label}.discount`);
  if (discount && !DISCOUNT.test(discount)) {
    throw new Error(`${label}.discount must look like "70%"`);
  }

  const blurb = value.blurb == null ? undefined : requireString(value.blurb, `${label}.blurb`);
  const priceNote =
    value.priceNote == null ? undefined : requireString(value.priceNote, `${label}.priceNote`);

  return {
    id,
    title: requireString(value.title, `${label}.title`),
    vendor: requireString(value.vendor, `${label}.vendor`),
    category: category as Category,
    url,
    price,
    currency,
    originalPrice: parseMoney(value.originalPrice, `${label}.originalPrice`),
    discount,
    priceStatus,
    priceNote,
    isFree: value.isFree,
    tags: value.tags.map((tag) => tag.trim()).filter(Boolean),
    blurb,
    addedAt: parseDate(value.addedAt, `${label}.addedAt`, true) as string,
    expiresAt: parseDate(value.expiresAt, `${label}.expiresAt`, false),
    featured: value.featured,
    featuredUntil: parseDate(value.featuredUntil, `${label}.featuredUntil`, false),
  };
}

export function getDeals(): Deal[] {
  if (!Array.isArray(rawDeals)) {
    throw new Error("data/deals.json must be a JSON array");
  }

  const deals = rawDeals.map((deal, index) => parseDeal(deal, index));
  const seen = new Set<string>();

  for (const deal of deals) {
    if (seen.has(deal.id)) {
      throw new Error(`Duplicate deal id: ${deal.id}`);
    }
    seen.add(deal.id);
  }

  return deals.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.addedAt !== b.addedAt) return a.addedAt < b.addedAt ? 1 : -1;
    return a.title.localeCompare(b.title);
  });
}

export function categoryCount(deals: Deal[], category: Category): number {
  return deals.filter((deal) => deal.category === category).length;
}
