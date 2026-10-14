import { siteName } from "@/lib/site";

export function Header({ sponsorHref }: { sponsorHref: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <a href="#radar" className="flex items-center gap-2.5">
          <Mark />
          <span className="text-[15px] font-medium tracking-tight">{siteName}</span>
        </a>
        {sponsorHref ? (
          <a
            href={sponsorHref}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full bg-signal px-3.5 py-2 text-center text-[13px] font-medium leading-tight text-ink transition-colors hover:bg-[#ff7a5e]"
          >
            Feature Your Plugin / Pack ($149)
          </a>
        ) : null}
      </div>
    </header>
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
