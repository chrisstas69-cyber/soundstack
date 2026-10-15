import { DealRadarFallback } from "@/components/deal-radar";
import { DealRadarLoader } from "@/components/deal-radar-loader";
import { SponsorThanks } from "@/components/sponsor-thanks";
import { getDeals } from "@/lib/deals";
import { buildJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { Suspense } from "react";

export default function HomePage() {
  const deals = getDeals();
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-12 pt-3 sm:px-8 sm:pt-4">
        <Suspense fallback={<DealRadarFallback deals={deals} />}>
          <DealRadarLoader deals={deals} />
        </Suspense>
      </main>
    </>
  );
}
