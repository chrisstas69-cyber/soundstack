import Link from "next/link";
import { FeatureCta } from "@/components/FeatureCta";
import { NavLinks } from "@/components/NavLinks";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-serif text-2xl leading-none tracking-tight text-foreground">
            SoundStack
          </Link>
          <NavLinks />
        </div>
        <FeatureCta />
      </div>
    </header>
  );
}
