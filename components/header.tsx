import { siteName } from "@/lib/site";
import Link from "next/link";
import type { ReactNode } from "react";

export function Header({
  sponsor,
  homeHref = "#radar",
}: {
  sponsor: { href: string; label: string } | null;
  homeHref?: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <HomeLink href={homeHref}>
          <Mark />
          <span className="text-[15px] font-medium tracking-tight">{siteName}</span>
        </HomeLink>
        {sponsor ? <SponsorCta href={sponsor.href} label={sponsor.label} /> : null}
      </div>
    </header>
  );
}

const ctaClass =
  "max-w-40 shrink rounded-full bg-signal px-3.5 py-2 text-center text-[13px] font-medium leading-tight text-ink transition-colors hover:bg-[#ff7a5e] sm:max-w-none";

function SponsorCta({ href, label }: { href: string; label: string }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={ctaClass}>
        {label}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={ctaClass}>
      {label}
    </a>
  );
}

function HomeLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const className = "flex items-center gap-2.5";
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

function Mark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6 text-signal"
      fill="none"
    >
      <path
        d="M3 16.5h6M3 12h12M3 7.5h18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
