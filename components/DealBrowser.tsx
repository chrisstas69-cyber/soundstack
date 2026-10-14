"use client";

import { useMemo, useState } from "react";
import { formatDay, formatMoney, priceCaption } from "@/lib/format";
import { CATEGORIES, type Category, type Deal } from "@/lib/types";

type Filter = "All" | Category;

function matches(deal: Deal, query: string, category: Filter): boolean {
  if (category !== "All" && deal.category !== category) return false;
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = [deal.title, deal.vendor, deal.category, deal.blurb ?? "", ...deal.tags]
    .join(" ")
    .toLowerCase();

  return terms.every((term) => haystack.includes(term));
}

function DealCard({ deal }: { deal: Deal }) {
  const price = deal.isFree ? "Free" : formatMoney(deal.price, deal.currency);
  const original = formatMoney(deal.originalPrice, deal.currency);

  return (
    <article
      className={`flex h-full flex-col rounded-2xl border bg-card p-5 transition-colors hover:bg-card-hover ${
        deal.featured ? "border-accent/50" : "border-line"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-faint">{deal.category}</p>
        {deal.featured ? (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-accent-ink">
            Featured
          </span>
        ) : null}
      </div>
      <h2 className="mt-3 font-serif text-[1.75rem] leading-none tracking-tight text-foreground">
        {deal.title}
      </h2>
      <p className="mt-2 text-sm text-muted">{deal.vendor}</p>
      {deal.blurb ? <p className="mt-3 text-sm leading-6 text-foreground/85">{deal.blurb}</p> : null}
      {deal.tags.length > 0 ? (
        <p className="mt-3 text-xs text-faint">{deal.tags.join(" · ")}</p>
      ) : null}
      <div className="mt-auto flex items-end justify-between gap-4 pt-6">
        <div>
          <p
            className={`font-serif text-3xl leading-none ${
              deal.isFree ? "text-free" : deal.originalPrice ? "text-sale" : "text-foreground"
            }`}
          >
            {price ?? "—"}
          </p>
          <p className="mt-2 text-xs text-faint">
            {original ? <span className="mr-2 line-through">{original}</span> : null}
            {deal.discount ? <span className="mr-2 text-sale">{deal.discount} off</span> : null}
            {priceCaption(deal)}
          </p>
          {deal.expiresAt ? (
            <p className="mt-1 text-xs text-faint">Through {formatDay(deal.expiresAt)}</p>
          ) : null}
          {deal.priceNote ? <p className="mt-2 max-w-[16rem] text-xs leading-5 text-faint">{deal.priceNote}</p> : null}
        </div>
        <a
          href={deal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full border border-line px-3 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          Open
        </a>
      </div>
    </article>
  );
}

export function DealBrowser({ deals }: { deals: Deal[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Filter>("All");

  const visible = useMemo(
    () => deals.filter((deal) => matches(deal, query, category)),
    [deals, query, category],
  );

  const counts = useMemo(() => {
    const tally = new Map<Filter, number>([["All", deals.length]]);
    for (const name of CATEGORIES) {
      tally.set(name, deals.filter((deal) => deal.category === name).length);
    }
    return tally;
  }, [deals]);

  const chips: Filter[] = ["All", ...CATEGORIES];

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
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Serum, Valhalla, 808…"
          className="h-12 w-full rounded-full border border-line bg-card px-5 text-base text-foreground outline-none placeholder:text-faint focus-visible:border-accent"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
          {chips.map((chip) => {
            const selected = chip === category;
            return (
              <button
                key={chip}
                type="button"
                aria-pressed={selected}
                onClick={() => setCategory(chip)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-line text-muted hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {chip}
                <span className={selected ? "text-background/70" : "text-faint"}> {counts.get(chip)}</span>
              </button>
            );
          })}
        </div>
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {visible.length} {visible.length === 1 ? "listing" : "listings"}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 max-w-md text-lg text-muted">
          Nothing matches that. Try a vendor, a synth name, or another category.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </section>
  );
}
