import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

const shared = {
  allow: "/",
  disallow: ["/api/"],
};

export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl();

  return {
    rules: [
      { userAgent: "*", ...shared },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "Google-Extended",
          "anthropic-ai",
          "ClaudeBot",
          "PerplexityBot",
        ],
        ...shared,
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
