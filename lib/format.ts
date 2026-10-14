import type { Currency, Deal } from "@/lib/types";

export function formatMoney(
  amount: string | null,
  currency: Currency | null,
): string | null {
  if (!amount) return null;
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  if (!currency) return amount;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

export function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function priceCaption(deal: Deal): string {
  if (deal.isFree) return "Free";
  if (!deal.price || deal.priceStatus === "unlisted") {
    return "Price not listed";
  }
  if (deal.priceStatus === "approximate") return "Approximate";
  if (deal.originalPrice) return "Verified sale";
  return "Verified list price";
}
