"use client";

import { useSearchParams } from "next/navigation";

export function SponsorThanks() {
  const params = useSearchParams();
  if (params.get("sponsored") !== "1") return null;

  return (
    <div className="border-b border-line bg-signal-soft" role="status">
      <p className="mx-auto max-w-6xl px-5 py-3 text-sm leading-6 text-bone">
        <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.16em] text-signal">
          Sponsored
        </span>
        Payment received. Your listing is pinned in the featured slot for 7 days.
      </p>
    </div>
  );
}
