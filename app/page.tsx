import { DealRadarFallback } from "@/components/deal-radar";
import { DealRadarLoader } from "@/components/deal-radar-loader";
import { Header } from "@/components/header";
import { NewsletterForm } from "@/components/newsletter-form";
import { SponsorThanks } from "@/components/sponsor-thanks";
import { formatIsoDate, getDeals, latestAddedAt } from "@/lib/deals";
import { buildJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { siteName, sponsorHref } from "@/lib/site";
import { Suspense } from "react";

export default function HomePage() {
  const deals = getDeals();
  const checked = formatIsoDate(latestAddedAt(deals));
  const jsonLd = serializeJsonLd(buildJsonLd(deals));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Header sponsorHref={sponsorHref()} />
      <Suspense fallback={null}>
        <SponsorThanks />
      </Suspense>
      <main>
        <section className="mx-auto max-w-6xl px-5 pb-8 pt-14 md:pt-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
            Deal radar · checked {checked}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-medium tracking-tight text-balance md:text-6xl">
            Plugins, presets, and packs worth opening.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-mute md:text-lg">
            A short list for producers who finish tracks. Shelf prices stay
            labeled as list prices. A discount appears only when the vendor
            publishes one.
          </p>
        </section>
        <Suspense fallback={<DealRadarFallback deals={deals} />}>
          <DealRadarLoader deals={deals} />
        </Suspense>
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute">
              Morning list
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-medium tracking-tight">
              One note when the radar changes.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-mute">
              No course pitches. The address is added to the SoundStack Resend
              audience.
            </p>
            <NewsletterForm />
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-mute sm:flex-row sm:items-center sm:justify-between">
          <p>{siteName}. Prices checked against vendor pages.</p>
          <nav className="flex gap-4">
            <a href="/llms.txt" className="hover:text-bone">
              llms.txt
            </a>
            <a href="/sitemap.xml" className="hover:text-bone">
              Sitemap
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
