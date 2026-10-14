"use client";

import { formatMoney, isFeaturedActive, priceStatusOf } from "@/lib/deals";
import { SPONSOR_LINK_REL } from "@/lib/sponsors";
import { CATEGORIES, type Deal, type DealCategory } from "@/lib/types";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

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
    return deals.filter((deal) => {
      if (category !== "all" && deal.category !== category) return false;
      if (terms.length === 0) return true;
      const haystack = [deal.title, deal.vendor, deal.category, ...deal.tags]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [category, deals, query]);

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
    <section id="listings" className="scroll-mt-24">
      <div className="flex flex-col gap-4">
        <label htmlFor="deal-search" className="text-xs uppercase tracking-[0.16em] text-faint">
          Search the list
        </label>
        <input
          id="deal-search"
          type="search"
          value={query}
          onChange={(event) => update(event.target.value, category)}
          placeholder="Search Serum, Valhalla, 808…"
          className="h-12 w-full rounded-full border border-line bg-card px-5 text-base text-foreground outline-none placeholder:text-faint focus-visible:border-accent"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
          {chips.map((chip) => {
            const selected = chip === category;
            const label = chip === "all" ? "All" : chip;
            return (
              <button
                key={chip}
                type="button"
                aria-pressed={selected}
                onClick={() => update(query, chip)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
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
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {visible.length} {visible.length === 1 ? "listing" : "listings"}
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="mt-10 max-w-md">
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
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              featured={isFeaturedActive(deal, today)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DealCard({ deal, featured }: { deal: Deal; featured: boolean }) {
  const status = priceStatusOf(deal);
  const price = status === "free" ? "Free" : deal.price == null ? null : formatMoney(deal.price, deal.currency);
  const original =
    status === "sale" && deal.originalPrice != null
      ? formatMoney(deal.originalPrice, deal.currency)
      : null;
  const highlighted = Boolean(deal.sponsored) || featured;

  return (
    <article
      className={`deal-card flex h-full flex-col rounded-2xl border bg-card p-[7px] ${
        highlighted ? "border-accent/50 hover:border-accent" : "border-line hover:border-foreground/40"
      }`}
    >
      <DealArtwork deal={deal} />
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

function DealArtwork({ deal }: { deal: Deal }) {
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
          loading="lazy"
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
