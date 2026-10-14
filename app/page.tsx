import { DealRadarFallback } from "@/components/deal-radar";
import { DealRadarLoader } from "@/components/deal-radar-loader";
import { NewsletterForm } from "@/components/newsletter-form";
import { SponsorThanks } from "@/components/sponsor-thanks";
import { formatDay, getDeals, latestAddedAt, priceStatusOf } from "@/lib/deals";
import { buildJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { Suspense } from "react";

export default function HomePage() {
  const deals = getDeals();
  const updated = latestAddedAt(deals);
  const freeCount = deals.filter(
    (deal) => deal.isFree || priceStatusOf(deal) === "free",
  ).length;
  const featuredCount = deals.filter((deal) => deal.featured).length;
  const jsonLd = serializeJsonLd(buildJsonLd(deals));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Suspense fallback={null}>
        <SponsorThanks />
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <section className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-faint">
            Updated {updated ? formatDay(updated) : "today"}
          </p>
          <h1 className="mt-4 max-w-xl font-serif text-5xl leading-[0.95] tracking-tight text-foreground sm:text-7xl">
            A short list, not a store.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
            Daily audio plugin sales, free Serum, Vital, and Diva presets, and boutique sample packs.
            A price appears only when it was read on the vendor&apos;s own page.
          </p>
          <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-faint">Listings</dt>
              <dd className="font-serif text-3xl text-foreground">{deals.length}</dd>
            </div>
            <div>
              <dt className="text-faint">Free</dt>
              <dd className="font-serif text-3xl text-free">{freeCount}</dd>
            </div>
            <div>
              <dt className="text-faint">Featured</dt>
              <dd className="font-serif text-3xl text-accent">{featuredCount}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-12 rounded-3xl border border-line bg-card/80 p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-md">
              <h2 className="font-serif text-3xl tracking-tight">The list, once a day.</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                New sales, free presets, and packs. Nothing else from us.
              </p>
            </div>
            <NewsletterForm />
          </div>
        </section>

        <div className="mt-14">
          <Suspense fallback={<DealRadarFallback deals={deals} />}>
            <DealRadarLoader deals={deals} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
