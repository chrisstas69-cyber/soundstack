import { getDeals, latestAddedAt } from "@/lib/deals";
import { siteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: latestAddedAt(getDeals()),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
