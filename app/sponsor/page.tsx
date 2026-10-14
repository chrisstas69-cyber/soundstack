import type { Metadata } from "next";
import { FeatureCta } from "@/components/FeatureCta";

export const metadata: Metadata = {
  title: "Feature your plugin",
  description: "Sponsor a SoundStack listing. Feature a plugin or sample pack for $149 via Stripe.",
  alternates: { canonical: "/sponsor" },
};

export default function SponsorPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14 sm:px-8 sm:py-20">
      <p className="text-[11px] uppercase tracking-[0.18em] text-faint">Sponsor</p>
      <h1 className="mt-4 font-serif text-5xl tracking-tight">Feature your plugin or pack</h1>
      <p className="mt-6 text-lg leading-8 text-muted">
        $149 puts a product in the featured row. Checkout is a Stripe Payment Link. The button stays
        disabled until that link is configured.
      </p>
      <ul className="mt-8 space-y-3 text-muted">
        <li>A featured flag on the listing, with an end date you agree at purchase.</li>
        <li>The card still links to your own product page. SoundStack does not resell licenses.</li>
        <li>The price shown to producers is still the one printed on your page.</li>
      </ul>
      <div className="mt-10">
        <FeatureCta prominent />
      </div>
      <p className="mt-6 max-w-xl text-sm leading-6 text-faint">
        After checkout, Stripe notifies /api/stripe/webhook. The handler verifies the signature and
        logs the sponsor. Saving that record, and flipping the featured flag, is the next step — it
        is noted in the route and is not done automatically yet.
      </p>
    </main>
  );
}
