import type { MetadataRoute } from "next";
import { getDeals } from "@/lib/deals";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const deals = getDeals();
  const lastModified = deals.reduce(
    (latest, deal) => (deal.addedAt > latest ? deal.addedAt : latest),
    "2026-10-14T12:00:00.000Z",
  );
  const modified = new Date(lastModified);

  return [
    {
      url: site,
      lastModified: modified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${site}/about`,
      lastModified: modified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${site}/sponsor`,
      lastModified: modified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
