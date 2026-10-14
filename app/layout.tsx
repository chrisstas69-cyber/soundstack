import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Newsreader, Outfit } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { siteDescription, siteName, siteUrl } from "@/lib/site";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — Deal radar for music producers`,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "VST deals",
    "audio plugin sales",
    "free Serum presets",
    "Vital presets",
    "Diva presets",
    "sample packs",
  ],
  openGraph: {
    type: "website",
    siteName,
    locale: "en_US",
    url: siteUrl,
    title: `${siteName} — Deal radar for music producers`,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — Deal radar for music producers`,
    description: siteDescription,
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${newsreader.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
