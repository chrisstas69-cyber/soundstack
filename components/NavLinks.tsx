"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Deals" },
  { href: "/about", label: "About" },
  { href: "/sponsor", label: "Sponsor" },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex items-center gap-4 text-sm">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={active ? "text-foreground" : "text-muted transition-colors hover:text-foreground"}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
