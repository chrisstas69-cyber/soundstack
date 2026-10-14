import { priceStatusOf } from "@/lib/deals";
import { siteDescription, siteName, siteUrl } from "@/lib/site";
import type { Deal } from "@/lib/types";

export function buildJsonLd(deals: Deal[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: siteName,
        url: siteUrl,
        description: siteDescription,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: siteName,
        url: siteUrl,
        description: siteDescription,
      },
      {
        "@type": "ItemList",
        "@id": `${siteUrl}/#deals`,
        name: "SoundStack deals",
        numberOfItems: deals.length,
        itemListOrder: "https://schema.org/ItemListUnordered",
        itemListElement: deals.map((deal, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: productNode(deal),
        })),
      },
    ],
  };
}

function productNode(deal: Deal) {
  const status = priceStatusOf(deal);
  const node: Record<string, unknown> = {
    "@type": "Product",
    name: deal.title,
    url: deal.url,
    category: deal.category,
    brand: {
      "@type": "Brand",
      name: deal.vendor,
    },
  };

  if (deal.image) {
    node.image = deal.image.startsWith("http") ? deal.image : `${siteUrl}${deal.image}`;
  }

  if (status !== "omitted" && deal.price != null && deal.currency) {
    node.offers = {
      "@type": "Offer",
      url: deal.url,
      price: deal.price,
      priceCurrency: deal.currency,
      availability: "https://schema.org/InStock",
    };
  }

  return node;
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
