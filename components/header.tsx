import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import { headerSponsorCta } from "@/lib/site";

const ctaClass =
  "inline-flex items-center justify-center rounded-full bg-accent px-3.5 py-2 text-center text-[13px] font-medium leading-tight text-accent-ink transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:text-sm";

export function Header() {
  const sponsor = headerSponsorCta();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-serif text-2xl leading-none tracking-tight text-foreground">
            SoundStack
          </Link>
          <NavLinks />
        </div>
        {sponsor ? (
          sponsor.href.startsWith("/") ? (
            <Link href={sponsor.href} className={ctaClass}>
              {sponsor.label}
            </Link>
          ) : (
            <a href={sponsor.href} target="_blank" rel="noopener noreferrer" className={ctaClass}>
              {sponsor.label}
            </a>
          )
        ) : null}
      </div>
    </header>
  );
}
