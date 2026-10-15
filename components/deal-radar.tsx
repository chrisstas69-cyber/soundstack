"use client";

import { NewsletterForm } from "@/components/newsletter-form";
import { formatDay, formatMoney, isFeaturedActive, latestAddedAt, priceStatusOf } from "@/lib/deals";
import { SPONSOR_LINK_REL } from "@/lib/sponsors";
import { CATEGORIES, type Deal, type DealCategory } from "@/lib/types";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Fragment, useMemo, useState } from "react";

type Filter = "all" | DealCategory;

export function DealRadar({
  deals,
  today,
}: {
  deals: Deal[];
  today: string;
}) {
  const params = useSearchParams();
  return (
    <DealRadarView
      deals={deals}
      today={today}
      initialQuery={params.get("q") ?? ""}
      initialCategory={params.get("category") ?? "all"}
      keepSponsoredThankYou={params.get("sponsored") === "1"}
    />
  );
}

export function DealRadarFallback({ deals }: { deals: Deal[] }) {
  return (
    <DealRadarView
      deals={deals}
      today={null}
      initialQuery=""
      initialCategory="all"
      keepSponsoredThankYou={false}
    />
  );
}

function DealRadarView({
  deals,
  today,
  initialQuery,
  initialCategory,
  keepSponsoredThankYou,
}: {
  deals: Deal[];
  today: string | null;
  initialQuery: string;
  initialCategory: string;
  keepSponsoredThankYou: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<Filter>(
    isFilter(initialCategory) ? initialCategory : "all",
  );

  const counts = useMemo(() => {
    const tally = new Map<Filter, number>([["all", deals.length]]);
    for (const name of CATEGORIES) {
      tally.set(name, deals.filter((deal) => deal.category === name).length);
    }
    return tally;
  }, [deals]);

  const visible = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = deals.filter((deal) => {
      if (category !== "all" && deal.category !== category) return false;
      if (terms.length === 0) return true;
      const haystack = [deal.title, deal.vendor, deal.category, ...deal.tags]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
    return withFeaturedFirst(filtered, today);
  }, [category, deals, query, today]);

  const updated = latestAddedAt(deals);
  const freeCount = deals.filter(
    (deal) => deal.isFree || priceStatusOf(deal) === "free",
  ).length;
  const featuredCount = deals.filter(
    (deal) => deal.sponsored || (today ? isFeaturedActive(deal, today) : deal.featured),
  ).length;
  const narrowed = query.trim().length > 0 || category !== "all";

  function update(nextQuery: string, nextCategory: Filter) {
    setQuery(nextQuery);
    setCategory(nextCategory);
    const search = new URLSearchParams();
    if (nextQuery.trim()) search.set("q", nextQuery);
    if (nextCategory !== "all") search.set("category", nextCategory);
    if (keepSponsoredThankYou) search.set("sponsored", "1");
    const href = search.size ? `/?${search.toString()}` : "/";
    window.history.replaceState(null, "", href);
  }

  const chips: Filter[] = ["all", ...CATEGORIES];

  return (
    <section id="listings" className="scroll-mt-20">
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <h1 className="min-w-0 font-serif text-xl leading-snug tracking-tight text-foreground sm:text-2xl sm:leading-tight lg:text-[1.45rem] lg:leading-none">
            Plugin deals, free presets, and sample packs, checked daily.
          </h1>
          <div className="w-full lg:w-72 lg:shrink-0">
            <label htmlFor="deal-search" className="sr-only">
              Search the list
            </label>
            <input
              id="deal-search"
              type="search"
              value={query}
              onChange={(event) => update(event.target.value, category)}
              placeholder="Search Serum, Valhalla, 808…"
              className="h-10 w-full rounded-full border border-line bg-card px-4 text-base text-foreground outline-none placeholder:text-faint focus-visible:border-accent"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm leading-5 text-muted">
            A price appears only when it was read on the vendor&apos;s own page.
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">
              {deals.length} listings
            </span>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">
              <span className="text-free">{freeCount}</span> free
            </span>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">
              <span className="text-accent">{featuredCount}</span> featured
            </span>
            {updated ? (
              <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-faint">
                Updated {formatDay(updated)}
              </span>
            ) : null}
            <p role="status" aria-live="polite" className={narrowed ? "text-xs text-muted" : "sr-only"}>
              {visible.length} {visible.length === 1 ? "listing" : "listings"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categories">
          {chips.map((chip) => {
            const selected = chip === category;
            const label = chip === "all" ? "All" : chip;
            return (
              <button
                key={chip}
                type="button"
                aria-pressed={selected}
                onClick={() => update(query, chip)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-line text-muted hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {label}
                <span className={selected ? "text-background/70" : "text-faint"}>
                  {" "}
                  {counts.get(chip) ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6">
          <div className="max-w-md">
            <p className="text-lg text-muted">
              Nothing matches that. Try a vendor, a synth name, or another category.
            </p>
            <button
              type="button"
              onClick={() => update("", "all")}
              className="mt-4 text-sm text-accent underline-offset-4 hover:underline"
            >
              Clear search and category
            </button>
          </div>
          <DailyListBar className="mt-6" />
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((deal, index) => (
            <Fragment key={deal.id}>
              <DealCard
                deal={deal}
                featured={isFeaturedActive(deal, today)}
                className={cardOrder(index)}
                priority={index < 3}
              />
              {showSignupAfter(index, visible.length) ? <DailyListBar /> : null}
            </Fragment>
          ))}
        </div>
      )}
    </section>
  );
}

function DailyListBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`order-2 col-span-full rounded-2xl border border-line bg-card/80 px-4 py-3 sm:px-5 ${className}`}
    >
      <NewsletterForm id="email-list" />
    </div>
  );
}

/** Signup follows the first full row: two cards below xl, three cards at xl. */
function cardOrder(index: number): string {
  if (index < 2) return "order-1";
  if (index === 2) return "order-3 xl:order-1";
  return "order-3";
}

function showSignupAfter(index: number, total: number): boolean {
  if (total >= 3) return index === 2;
  return index === total - 1;
}

function listingRank(deal: Deal, today: string | null): number {
  if (deal.sponsored) return 0;
  if (isFeaturedActive(deal, today)) return 1;
  return 2;
}

function withFeaturedFirst(deals: Deal[], today: string | null): Deal[] {
  return deals
    .map((deal, index) => ({ deal, index, rank: listingRank(deal, today) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((row) => row.deal);
}

function DealCard({
  deal,
  featured,
  className = "",
  priority = false,
}: {
  deal: Deal;
  featured: boolean;
  className?: string;
  priority?: boolean;
}) {
  const status = priceStatusOf(deal);
  const price = status === "free" ? "Free" : deal.price == null ? null : formatMoney(deal.price, deal.currency);
  const original =
    status === "sale" && deal.originalPrice != null
      ? formatMoney(deal.originalPrice, deal.currency)
      : null;
  const highlighted = Boolean(deal.sponsored) || featured;

  return (
    <article
      className={`deal-card flex h-full flex-col rounded-2xl border bg-card p-[7px] ${className} ${
        highlighted ? "border-accent/50 hover:border-accent" : "border-line hover:border-foreground/40"
      }`}
    >
      <DealArtwork deal={deal} priority={priority} />
      <div className="flex flex-1 flex-col px-[5px] pb-[3px] pt-[9px]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-faint">{deal.category}</p>
          {deal.sponsored ? (
            <span className="rounded-full bg-sale px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-accent-ink">
              Sponsored
            </span>
          ) : featured ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-accent-ink">
              Featured
            </span>
          ) : null}
        </div>
        <h2 className="mt-[3px] font-serif text-[1.75rem] leading-none tracking-tight text-foreground">
          {deal.title}
        </h2>
        <p className="mt-1 text-sm text-muted">{deal.vendor}</p>
        {deal.tags.length > 0 ? (
          <p className="mt-2 text-xs text-faint">{deal.tags.join(" · ")}</p>
        ) : null}
        <div className="mt-auto flex items-end justify-between gap-4 pt-4">
          <div>
            <p
              className={`font-serif text-3xl leading-none ${
                status === "free"
                  ? "text-free"
                  : status === "sale"
                    ? "text-sale"
                    : status === "omitted" || deal.price == null
                      ? "text-faint"
                      : "text-foreground"
              }`}
            >
              {price ?? "—"}
            </p>
            <p className="mt-2 text-xs text-faint">
              {original ? <span className="mr-2 line-through">{original}</span> : null}
              {status === "sale" && deal.discount ? (
                <span className="mr-2 text-sale">{deal.discount} off</span>
              ) : null}
              {priceCaption(status)}
            </p>
            {deal.expiresAt ? (
              <p className="mt-1 text-xs text-faint">Through {formatCardDay(deal.expiresAt)}</p>
            ) : null}
            {deal.priceNote ? (
              <p className="mt-2 max-w-[16rem] text-xs leading-5 text-faint">{deal.priceNote}</p>
            ) : null}
          </div>
          <a
            href={deal.url}
            target="_blank"
            rel={deal.sponsored ? SPONSOR_LINK_REL : "noopener noreferrer"}
            aria-label={`Open ${deal.title} from ${deal.vendor}`}
            className="shrink-0 text-sm text-accent underline-offset-4 hover:underline"
          >
            Open ↗
          </a>
        </div>
      </div>
    </article>
  );
}

function DealArtwork({ deal, priority }: { deal: Deal; priority: boolean }) {
  const initial = deal.vendor.trim().charAt(0).toUpperCase() || "S";

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[10px] bg-background">
      {deal.image ? (
        <Image
          src={deal.image}
          alt={`${deal.title} by ${deal.vendor}`}
          fill
          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover"
          loading={priority ? "eager" : "lazy"}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <span aria-hidden="true" className="font-serif text-7xl leading-none text-faint">
            {initial}
          </span>
          <span className="sr-only">{deal.vendor}</span>
        </div>
      )}
    </div>
  );
}

function priceCaption(status: ReturnType<typeof priceStatusOf>): string {
  if (status === "free") return "Free";
  if (status === "omitted") return "Price not listed";
  if (status === "sale") return "Verified sale";
  return "Verified list price";
}

function formatCardDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function isFilter(value: string): value is Filter {
  return value === "all" || CATEGORIES.includes(value as DealCategory);
}
