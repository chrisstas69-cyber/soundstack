import { FeatureRequestForm } from "@/components/feature-request-form";
import {
  foundingCheckoutHref,
  fullCheckoutHref,
  sponsorMode,
} from "@/lib/site";
import type { Metadata } from "next";

const paidDescription =
  "Feature a plugin on SoundStack. $79 for the first 5 sponsors, then $149. Seven days pinned at #1, plus the next newsletter, for music producers hunting plugin deals.";

const freeDescription =
  "Feature a plugin on SoundStack for free as an early partner. Seven days pinned, a newsletter mention, and we ask only that you share the listing. Paid slots at $149/week are coming later.";

export const metadata: Metadata = {
  title: "Advertise",
  description: sponsorMode() === "free" ? freeDescription : paidDescription,
  alternates: {
    canonical: "/advertise",
  },
};

export default function AdvertisePage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-14 sm:px-8 sm:py-20">
      {sponsorMode() === "free" ? <FreeOffer /> : <PaidOffer />}
    </main>
  );
}

function FreeOffer() {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.18em] text-faint">Early partner</p>
      <h1 className="mt-4 max-w-3xl font-serif text-5xl tracking-tight text-balance md:text-6xl">
        Get your plugin featured.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
        SoundStack is opening free early-partner features while the audience
        grows. A feature is 7 days pinned and includes a newsletter mention.
        We ask only that you share the listing.
      </p>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
        Paid slots at $149/week are coming later.
      </p>
      <FeatureRequestForm />
    </>
  );
}

function PaidOffer() {
  const founding = foundingCheckoutHref();
  const full = fullCheckoutHref();

  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.18em] text-faint">Sponsorship</p>
      <h1 className="mt-4 max-w-3xl font-serif text-5xl tracking-tight text-balance md:text-6xl">
        Pin your plugin at #1.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
        SoundStack is a deal radar for music producers hunting plugin deals.
        A sponsorship pins your plugin or pack at #1 for 7 days and includes
        it in the next newsletter.
      </p>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <Offer
          kicker="Founding"
          price="$79"
          detail="The first 5 sponsors. 7 days pinned at #1, plus the next newsletter."
          href={founding}
          label="Feature for $79"
          tone="accent"
        />
        <Offer
          kicker="Standard"
          price="$149"
          detail="After the founding spots are filled. 7 days pinned at #1, plus the next newsletter."
          href={full}
          label="Feature for $149"
          tone="foreground"
        />
      </div>
    </>
  );
}

function Offer({
  kicker,
  price,
  detail,
  href,
  label,
  tone,
}: {
  kicker: string;
  price: string;
  detail: string;
  href: string | null;
  label: string;
  tone: "accent" | "foreground";
}) {
  const buttonClass =
    tone === "accent"
      ? "bg-accent text-accent-ink hover:-translate-y-px"
      : "bg-foreground text-background hover:-translate-y-px";

  return (
    <article className="flex flex-col rounded-3xl border border-line bg-card p-6">
      <p className="text-[11px] uppercase tracking-[0.18em] text-faint">{kicker}</p>
      <p className="mt-4 font-serif text-5xl tracking-tight">{price}</p>
      <p className="mt-3 text-sm leading-6 text-muted">{detail}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-6 inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-medium transition-transform ${buttonClass}`}
        >
          {label}
        </a>
      ) : (
        <p className="mt-6 text-sm text-faint">Checkout link is not set.</p>
      )}
    </article>
  );
}
