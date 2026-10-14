import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-serif text-2xl tracking-tight">SoundStack</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            An independent radar. Not affiliated with the vendors linked from the list.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          <Link href="/about" className="hover:text-foreground">
            About
          </Link>
          <Link href="/sponsor" className="hover:text-foreground">
            Sponsor
          </Link>
          <a href="/llms.txt" className="hover:text-foreground">
            llms.txt
          </a>
          <a href="/sitemap.xml" className="hover:text-foreground">
            Sitemap
          </a>
        </div>
      </div>
    </footer>
  );
}
