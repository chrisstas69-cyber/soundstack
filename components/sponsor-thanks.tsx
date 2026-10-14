"use client";

import { useSearchParams } from "next/navigation";

export function SponsorThanks() {
  const params = useSearchParams();
  if (params.get("sponsored") !== "1") return null;

  return (
    <div className="border-b border-line bg-card" role="status">
      <p className="mx-auto max-w-6xl px-5 py-3 text-sm leading-6 text-foreground sm:px-8">
        <span className="mr-2 text-[11px] font-medium uppercase tracking-[0.12em] text-accent">
          Sponsored
        </span>
        Payment received. Your listing is pinned in the featured slot for 7 days.
      </p>
    </div>
  );
}
