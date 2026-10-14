import type { Metadata } from "next";
import { CATEGORIES } from "@/lib/types";

export const metadata: Metadata = {
  title: "About",
  description:
    "How SoundStack chooses plugin sales, free presets, and boutique sample packs, and when a price is shown.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14 sm:px-8 sm:py-20">
      <p className="text-[11px] uppercase tracking-[0.18em] text-faint">About</p>
      <h1 className="mt-4 font-serif text-5xl tracking-tight">How the radar works</h1>
      <div className="mt-8 space-y-5 text-base leading-7 text-muted">
        <p>
          SoundStack is a short, curated list for producers: instrument and effect plug-ins, free
          presets for Serum, Vital, and Diva, and smaller sample labels. Each card links to the
          vendor&apos;s own page.
        </p>
        <p>
          A price is stored only when it was read from that page. If the page does not print a
          price, the card says so instead of guessing. Compare-at figures are kept when the vendor
          prints them, and the card notes when that number is a bundle total rather than a previous
          street price.
        </p>
        <p>
          Cards marked Featured in the opening list are editorial spotlights. They are not paid
          placements. Paid featuring is a separate checkout, described on the sponsor page, and is
          meant to set the same flag once a sponsor is recorded.
        </p>
      </div>
      <h2 className="mt-12 font-serif text-3xl tracking-tight text-foreground">Categories</h2>
      <ul className="mt-4 space-y-2 text-muted">
        {CATEGORIES.map((category) => (
          <li key={category}>{category}</li>
        ))}
      </ul>
    </main>
  );
}
