import { FeatureRequestForm } from "@/components/feature-request-form";
import { Header } from "@/components/header";
import Link from "next/link";
import {
  foundingCheckoutHref,
  fullCheckoutHref,
  headerSponsorCta,
  siteName,
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
    <>
      <Header sponsor={headerSponsorCta()} homeHref="/" />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-14 md:pt-20">
        {sponsorMode() === "free" ? <FreeOffer /> : <PaidOffer />}
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-mute sm:flex-row sm:items-center sm:justify-between">
          <p>{siteName}. Prices checked against vendor pages.</p>
          <nav className="flex gap-4">
            <Link href="/" className="hover:text-bone">
              Radar
            </Link>
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

function FreeOffer() {
  return (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
        Early partner
      </p>
      <h1 className="mt-4 max-w-3xl text-4xl font-medium tracking-tight text-balance md:text-6xl">
        Get your plugin featured.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-mute md:text-lg">
        SoundStack is opening free early-partner features while the audience
        grows. A feature is 7 days pinned and includes a newsletter mention.
        We ask only that you share the listing.
      </p>
      <p className="mt-4 max-w-2xl text-base leading-7 text-mute md:text-lg">
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
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
        Sponsorship
      </p>
      <h1 className="mt-4 max-w-3xl text-4xl font-medium tracking-tight text-balance md:text-6xl">
        Pin your plugin at #1.
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-mute md:text-lg">
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
          tone="signal"
        />
        <Offer
          kicker="Standard"
          price="$149"
          detail="After the founding spots are filled. 7 days pinned at #1, plus the next newsletter."
          href={full}
          label="Feature for $149"
          tone="bone"
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
  tone: "signal" | "bone";
}) {
  const buttonClass =
    tone === "signal"
      ? "bg-signal text-ink hover:bg-[#ff7a5e]"
      : "bg-bone text-ink hover:bg-white";

  return (
    <article className="flex flex-col rounded-3xl border border-line bg-panel p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
        {kicker}
      </p>
      <p className="mt-4 font-mono text-4xl tabular-nums tracking-tight">{price}</p>
      <p className="mt-3 text-sm leading-6 text-mute">{detail}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-6 inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors ${buttonClass}`}
        >
          {label}
        </a>
      ) : (
        <p className="mt-6 text-sm text-mute">Checkout link is not set.</p>
      )}
    </article>
  );
}
