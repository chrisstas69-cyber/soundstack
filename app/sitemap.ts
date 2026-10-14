import { getDeals, latestAddedAt } from "@/lib/deals";
import { siteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = latestAddedAt(getDeals());
  return [
    {
      url: siteUrl,
      lastModified: updated,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/advertise`,
      lastModified: updated,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];
}
