import type { Deal, DealCategory } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

/** Featured through this UTC date, 30 days after the checkout date. */
export const SPONSOR_FEATURED_DAYS = 30;

const NAME_KEYS = new Set([
  "pluginname",
  "packname",
  "listingname",
  "productname",
  "name",
]);
const URL_KEYS = new Set([
  "pluginurl",
  "packurl",
  "listingurl",
  "producturl",
  "url",
  "website",
]);
const CATEGORY_KEYS = new Set(["category", "listingcategory"]);
const VENDOR_KEYS = new Set(["vendor", "brand", "maker", "company"]);

export type Sponsor = {
  id: string;
  email: string | null;
  amountTotal: number | null;
  currency: string | null;
  name: string;
  url: string;
  vendor: string;
  category: DealCategory;
  paidAt: string;
  featuredUntil: string;
};

export type CheckoutCustomField = {
  key: string;
  label?: { custom?: string | null } | null;
  text?: { value?: string | null } | null;
  numeric?: { value?: string | null } | null;
  dropdown?: { value?: string | null } | null;
};

/**
 * Fields read from a verified Checkout Session. Custom fields are filled by
 * the buyer on a Payment Link. Metadata and client_reference_id cover
 * Checkout Sessions created via the API.
 */
export type CheckoutSponsorSource = {
  id: string;
  created: number;
  payment_status: string;
  amount_total?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
  customer_details?: { email?: string | null } | null;
  custom_fields?: CheckoutCustomField[] | null;
};

export type SponsorFromCheckout =
  | { ok: true; sponsor: Sponsor }
  | { ok: false; reason: "unpaid" | "missing-listing" };

type ListingDraft = {
  name: string;
  url: string;
  category: string;
  vendor: string;
};

export function sponsorFromCheckout(
  session: CheckoutSponsorSource,
): SponsorFromCheckout {
  if (session.payment_status !== "paid") {
    return { ok: false, reason: "unpaid" };
  }

  const draft: ListingDraft = { name: "", url: "", category: "", vendor: "" };
  applyCustomFields(draft, session.custom_fields ?? []);
  applyMetadata(draft, session.metadata);
  applyClientReference(draft, session.client_reference_id);

  const name = cleanName(draft.name);
  const url = cleanHttpsUrl(draft.url);
  if (!name || !url || !isSessionId(session.id)) {
    return { ok: false, reason: "missing-listing" };
  }

  const paidAt = paidAtFromUnix(session.created);
  return {
    ok: true,
    sponsor: {
      id: session.id,
      email: cleanEmail(
        session.customer_details?.email ?? session.customer_email,
      ),
      amountTotal: cleanAmount(session.amount_total),
      currency: cleanCurrency(session.currency),
      name,
      url,
      vendor: cleanName(draft.vendor) ?? vendorFromUrl(url),
      category: cleanCategory(draft.category),
      paidAt,
      featuredUntil: addUtcDays(paidAt, SPONSOR_FEATURED_DAYS),
    },
  };
}

export function mergeSponsorsIntoDeals(
  deals: Deal[],
  sponsors: Sponsor[],
  today: string,
): Deal[] {
  const copies = deals.map(cloneDeal);
  if (!isIsoDate(today)) return copies;

  const active = activeSponsors(sponsors, today);
  const pinned: Deal[] = [];

  for (const sponsor of active) {
    const key = normalizeUrlKey(sponsor.url);
    const index = copies.findIndex((deal) => normalizeUrlKey(deal.url) === key);
    if (index >= 0) {
      const deal = copies[index];
      pinExistingDeal(deal, sponsor.featuredUntil);
      pinned.push(deal);
      copies.splice(index, 1);
      continue;
    }

    const created = sponsorToDeal(sponsor);
    if (created) pinned.push(created);
  }

  return [...pinned, ...copies];
}

export function sponsorToDeal(sponsor: Sponsor): Deal | null {
  const stored = sanitizeSponsor(sponsor);
  if (!stored) return null;

  return {
    id: `sponsor-${stored.id}`,
    title: stored.name,
    vendor: stored.vendor,
    category: stored.category,
    url: stored.url,
    price: null,
    originalPrice: null,
    discount: null,
    isFree: false,
    tags: ["sponsor"],
    addedAt: stored.paidAt,
    expiresAt: null,
    featured: true,
    featuredUntil: stored.featuredUntil,
    priceStatus: "omitted",
    priceNote: "Featured placement. The price is on the vendor page.",
  };
}

export function parseSponsorStore(text: string): Sponsor[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Sponsor store is not valid JSON.");
  }

  const rows = sponsorRows(parsed);
  if (!rows) throw new Error("Sponsor store JSON is not a list.");

  const sponsors: Sponsor[] = [];
  for (const row of rows) {
    const sponsor = sanitizeSponsor(row);
    if (sponsor) sponsors.push(sponsor);
  }
  return sponsors;
}

export function serializeSponsorStore(sponsors: Sponsor[]): string {
  return JSON.stringify({ version: 1, sponsors });
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function addUtcDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function normalizeUrlKey(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    const port = parsed.port ? `:${parsed.port}` : "";
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${port}${path}${parsed.search}`;
  } catch {
    return url.trim();
  }
}

function activeSponsors(sponsors: Sponsor[], today: string): Sponsor[] {
  const byUrl = new Map<string, Sponsor>();

  for (const sponsor of sponsors) {
    const stored = sanitizeSponsor(sponsor);
    if (!stored || stored.featuredUntil < today) continue;
    const key = normalizeUrlKey(stored.url);
    const current = byUrl.get(key);
    if (!current || compareSponsors(stored, current) > 0) {
      byUrl.set(key, stored);
    }
  }

  return [...byUrl.values()].sort((a, b) => compareSponsors(b, a));
}

function compareSponsors(a: Sponsor, b: Sponsor): number {
  const byUntil = a.featuredUntil.localeCompare(b.featuredUntil);
  if (byUntil !== 0) return byUntil;
  const byPaid = a.paidAt.localeCompare(b.paidAt);
  if (byPaid !== 0) return byPaid;
  return a.id.localeCompare(b.id);
}

function pinExistingDeal(deal: Deal, featuredUntil: string): void {
  const openEnded = deal.featured && !deal.featuredUntil;
  deal.featured = true;
  if (openEnded) return;
  if (!deal.featuredUntil || featuredUntil > deal.featuredUntil) {
    deal.featuredUntil = featuredUntil;
  }
}

function cloneDeal(deal: Deal): Deal {
  return { ...deal, tags: [...deal.tags] };
}

function applyCustomFields(draft: ListingDraft, fields: CheckoutCustomField[]) {
  const unlabeled: CheckoutCustomField[] = [];

  for (const field of fields) {
    const value = fieldValue(field);
    if (!value) continue;
    const key = compactKey(field.key);
    if (listingRole(key)) {
      assignListing(draft, key, value);
      continue;
    }
    unlabeled.push(field);
  }

  for (const field of unlabeled) {
    const value = fieldValue(field);
    const role = roleFromLabel(field.label?.custom ?? "");
    if (!role || draft[role]) continue;
    draft[role] = value;
  }
}

function applyMetadata(
  draft: ListingDraft,
  metadata: Record<string, string> | null | undefined,
) {
  if (!metadata) return;
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value !== "string" || !value.trim()) continue;
    assignListing(draft, compactKey(key), value.trim());
  }
}

function applyClientReference(
  draft: ListingDraft,
  reference: string | null | undefined,
) {
  const value = reference?.trim() ?? "";
  if (!value) return;

  if (value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [key, raw] of Object.entries(parsed)) {
          if (typeof raw !== "string" || !raw.trim()) continue;
          assignListing(draft, compactKey(key), raw.trim());
        }
      }
    } catch {
      // Ignore a value that only looks like JSON.
    }
    return;
  }

  const pipe = value.indexOf("|");
  if (pipe > 0) {
    assignIfEmpty(draft, "name", value.slice(0, pipe).trim());
    assignIfEmpty(draft, "url", value.slice(pipe + 1).trim());
    return;
  }

  if (cleanHttpsUrl(value)) assignIfEmpty(draft, "url", value);
  else assignIfEmpty(draft, "name", value);
}

function listingRole(key: string): keyof ListingDraft | null {
  if (NAME_KEYS.has(key)) return "name";
  if (URL_KEYS.has(key)) return "url";
  if (CATEGORY_KEYS.has(key)) return "category";
  if (VENDOR_KEYS.has(key)) return "vendor";
  return null;
}

function assignListing(draft: ListingDraft, key: string, value: string): boolean {
  const role = listingRole(key);
  if (!role) return false;
  return assignIfEmpty(draft, role, value);
}

function assignIfEmpty(
  draft: ListingDraft,
  role: keyof ListingDraft,
  value: string,
): boolean {
  if (!value || draft[role]) return false;
  draft[role] = value;
  return true;
}

function roleFromLabel(label: string): keyof ListingDraft | null {
  const text = label.toLowerCase();
  if (!text) return null;
  if (text.includes("category")) return "category";
  if (/\b(vendor|brand|company|maker)\b/.test(text)) return "vendor";
  if (/\burl\b|website|\blink\b/.test(text)) return "url";
  if (/\bname\b|\btitle\b|\bplugin\b|\bpack\b/.test(text)) return "name";
  return null;
}

function fieldValue(field: CheckoutCustomField): string {
  const raw =
    field.text?.value ?? field.dropdown?.value ?? field.numeric?.value ?? "";
  return typeof raw === "string" ? raw.trim() : "";
}

function compactKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanName(value: string): string | null {
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
  if (cleaned.length < 1 || cleaned.length > 120) return null;
  return cleaned;
}

export function cleanHttpsUrl(value: string): string | null {
  let trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) trimmed = `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;

  const host = parsed.hostname.toLowerCase();
  if (
    !host.includes(".") ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    return null;
  }

  parsed.hash = "";
  return parsed.toString();
}

function vendorFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Sponsor";
  }
}

function cleanCategory(value: string): DealCategory {
  const match = CATEGORIES.find(
    (category) => category.toLowerCase() === value.trim().toLowerCase(),
  );
  return match ?? "VST Plugins";
}

function cleanEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }
  return email;
}

function cleanAmount(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function cleanCurrency(value: string | null | undefined): string | null {
  if (!value) return null;
  const currency = value.trim().toLowerCase();
  return /^[a-z]{3}$/.test(currency) ? currency : null;
}

function paidAtFromUnix(created: number): string {
  if (typeof created === "number" && Number.isFinite(created)) {
    return new Date(created * 1000).toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function isSessionId(id: string): boolean {
  return /^cs_[A-Za-z0-9_]+$/.test(id);
}

function sponsorRows(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== "object") return null;
  const sponsors = (parsed as { sponsors?: unknown }).sponsors;
  return Array.isArray(sponsors) ? sponsors : null;
}

export function sanitizeSponsor(value: unknown): Sponsor | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<Sponsor>;
  if (typeof row.id !== "string" || !isSessionId(row.id)) return null;
  if (typeof row.name !== "string" || typeof row.url !== "string") return null;
  if (typeof row.paidAt !== "string" || typeof row.featuredUntil !== "string") {
    return null;
  }

  const name = cleanName(row.name);
  const url = cleanHttpsUrl(row.url);
  if (!name || !url || !isIsoDate(row.paidAt) || !isIsoDate(row.featuredUntil)) {
    return null;
  }

  return {
    id: row.id,
    email: cleanEmail(typeof row.email === "string" ? row.email : null),
    amountTotal: cleanAmount(row.amountTotal),
    currency: cleanCurrency(typeof row.currency === "string" ? row.currency : null),
    name,
    url,
    vendor: (typeof row.vendor === "string" && cleanName(row.vendor)) || vendorFromUrl(url),
    category: cleanCategory(typeof row.category === "string" ? row.category : ""),
    paidAt: row.paidAt,
    featuredUntil: row.featuredUntil,
  };
}
