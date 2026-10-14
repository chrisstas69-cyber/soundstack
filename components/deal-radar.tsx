"use client";

import {
  formatMoney,
  isFeaturedActive,
  priceStatusOf,
} from "@/lib/deals";
import { CATEGORIES, type Deal, type DealCategory } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";

export function DealRadar({ deals }: { deals: Deal[] }) {
  const params = useSearchParams();
  return (
    <DealRadarView
      deals={deals}
      initialQuery={params.get("q") ?? ""}
      initialCategory={params.get("category") ?? "all"}
    />
  );
}

export function DealRadarFallback({ deals }: { deals: Deal[] }) {
  return <DealRadarView deals={deals} initialQuery="" initialCategory="all" />;
}

function DealRadarView({
  deals,
  initialQuery,
  initialCategory,
}: {
  deals: Deal[];
  initialQuery: string;
  initialCategory: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<string>(
    isCategory(initialCategory) ? initialCategory : "all",
  );
  const today = useSyncExternalStore(subscribe, getToday, getServerToday);

  const counts = useMemo(() => {
    const tally = new Map<string, number>();
    for (const deal of deals) {
      tally.set(deal.category, (tally.get(deal.category) ?? 0) + 1);
    }
    return tally;
  }, [deals]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return deals.filter((deal) => {
      if (category !== "all" && deal.category !== category) return false;
      if (!needle) return true;
      const haystack = [deal.title, deal.vendor, deal.category, ...deal.tags]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [category, deals, query]);

  function update(nextQuery: string, nextCategory: string) {
    setQuery(nextQuery);
    setCategory(nextCategory);
    const search = new URLSearchParams();
    if (nextQuery.trim()) search.set("q", nextQuery);
    if (nextCategory !== "all") search.set("category", nextCategory);
    const href = search.size ? `/?${search.toString()}` : "/";
    window.history.replaceState(null, "", href);
  }

  return (
    <section id="radar" className="mx-auto max-w-6xl px-5 pb-16">
      <div className="flex flex-col gap-4 border-b border-line pb-5">
        <label className="sr-only" htmlFor="deal-search">
          Search deals
        </label>
        <input
          id="deal-search"
          type="search"
          value={query}
          placeholder="Search titles, vendors, tags"
          onChange={(event) => update(event.target.value, category)}
          className="h-12 w-full rounded-full border border-line bg-panel px-5 text-base text-bone outline-none placeholder:text-mute"
        />
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by category"
        >
          <Chip
            pressed={category === "all"}
            onClick={() => update(query, "all")}
            label="All"
            count={deals.length}
          />
          {CATEGORIES.map((name) => (
            <Chip
              key={name}
              pressed={category === name}
              onClick={() => update(query, name)}
              label={name}
              count={counts.get(name) ?? 0}
            />
          ))}
        </div>
        <p className="font-mono text-xs tracking-wide text-mute">
          {visible.length} of {deals.length}
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg">Nothing matches that filter.</p>
          <button
            type="button"
            onClick={() => update("", "all")}
            className="mt-4 text-sm text-signal underline-offset-4 hover:underline"
          >
            Clear search and category
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {visible.map((deal) => (
            <DealRow
              key={deal.id}
              deal={deal}
              featured={isFeaturedActive(deal, today)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function DealRow({ deal, featured }: { deal: Deal; featured: boolean }) {
  const status = priceStatusOf(deal);

  return (
    <li className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_11rem_5.5rem] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
            {deal.category}
          </span>
          {featured ? (
            <span className="rounded-full bg-signal-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
              Featured
            </span>
          ) : null}
        </div>
        <h2 className="mt-1 truncate text-lg font-medium tracking-tight">
          {deal.title}
        </h2>
        <p className="text-sm text-mute">{deal.vendor}</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {deal.tags.slice(0, 4).map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-mute"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>

      <div title={deal.priceNote} className="md:text-right">
        <Price deal={deal} status={status} />
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mute">
          {statusLabel(status)}
        </p>
      </div>

      <a
        href={deal.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${deal.title} from ${deal.vendor}`}
        className="inline-flex h-10 items-center justify-center rounded-full border border-line px-4 text-sm text-bone transition-colors hover:border-bone/40 hover:bg-white/5 md:justify-self-end"
      >
        Open
      </a>
    </li>
  );
}

function Price({
  deal,
  status,
}: {
  deal: Deal;
  status: ReturnType<typeof priceStatusOf>;
}) {
  if (status === "free") {
    return <p className="font-mono text-lg text-bone">Free</p>;
  }

  if (status === "omitted" || deal.price == null) {
    return <p className="font-mono text-lg text-mute">See vendor</p>;
  }

  return (
    <p className="flex flex-wrap items-baseline gap-2 md:justify-end">
      <span className="font-mono text-lg tabular-nums">
        {formatMoney(deal.price, deal.currency)}
      </span>
      {status === "sale" && deal.originalPrice != null ? (
        <span className="font-mono text-sm tabular-nums text-mute line-through">
          {formatMoney(deal.originalPrice, deal.currency)}
        </span>
      ) : null}
      {status === "sale" && deal.discount ? (
        <span className="font-mono text-xs text-signal">−{deal.discount}</span>
      ) : null}
    </p>
  );
}

function statusLabel(status: ReturnType<typeof priceStatusOf>): string {
  if (status === "sale") return "Sale";
  if (status === "free") return "Free";
  if (status === "list") return "List price";
  return "Unverified";
}

function Chip({
  pressed,
  onClick,
  label,
  count,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        pressed
          ? "border-bone bg-bone text-ink"
          : "border-line text-bone hover:border-bone/40"
      }`}
    >
      {label}
      <span className={`ml-1.5 font-mono text-xs ${pressed ? "text-ink/60" : "text-mute"}`}>
        {count}
      </span>
    </button>
  );
}

function isCategory(value: string): value is DealCategory | "all" {
  return value === "all" || CATEGORIES.includes(value as DealCategory);
}

function subscribe() {
  return () => {};
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getServerToday() {
  return null;
}
