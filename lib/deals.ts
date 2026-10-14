import dealsJson from "@/data/deals.json";
import { CATEGORIES, type Deal, type PriceStatus } from "@/lib/types";

const deals = dealsJson as Deal[];

function assertDeals(rows: Deal[]): Deal[] {
  const ids = new Set<string>();

  for (const deal of rows) {
    if (!deal.id || ids.has(deal.id)) {
      throw new Error(`Deal id missing or duplicated: ${deal.id}`);
    }
    ids.add(deal.id);
    if (!CATEGORIES.includes(deal.category)) {
      throw new Error(`Unknown category on ${deal.id}`);
    }
    if (!deal.url.startsWith("https://")) {
      throw new Error(`Deal url must be https on ${deal.id}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deal.addedAt)) {
      throw new Error(`addedAt must be YYYY-MM-DD on ${deal.id}`);
    }
    if (
      deal.image != null &&
      (typeof deal.image !== "string" ||
        !/^\/deals\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp|gif|avif)$/.test(deal.image))
    ) {
      throw new Error(`image must be a /deals file path on ${deal.id}`);
    }
    if (
      deal.imageSource != null &&
      (typeof deal.imageSource !== "string" || !deal.imageSource.startsWith("https://"))
    ) {
      throw new Error(`imageSource must be an https URL on ${deal.id}`);
    }
  }

  return rows;
}

export function getDeals(): Deal[] {
  return assertDeals(deals);
}

export function priceStatusOf(deal: Deal): PriceStatus {
  if (deal.priceStatus) return deal.priceStatus;
  if (deal.isFree) return "free";
  if (deal.price == null) return "omitted";
  if (deal.originalPrice != null && deal.originalPrice > deal.price) {
    return "sale";
  }
  return "list";
}

export function isFeaturedActive(deal: Deal, today: string | null): boolean {
  if (!deal.featured || !today) return false;
  if (!deal.featuredUntil) return true;
  return deal.featuredUntil >= today;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Short month and day, matching the original radar date label. */
export function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  const monthName = MONTHS[Number(month) - 1] ?? month;
  return `${Number(day)} ${monthName} ${year}`;
}

export function latestAddedAt(rows: Deal[]): string {
  return rows.reduce(
    (max, deal) => (deal.addedAt > max ? deal.addedAt : max),
    rows[0]?.addedAt ?? "",
  );
}

export function formatMoney(
  amount: number,
  currency: Deal["currency"],
): string {
  const value = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  if (currency === "EUR") return `€${value}`;
  if (currency === "GBP") return `£${value}`;
  if (currency === "USD") return `$${value}`;
  return value;
}
