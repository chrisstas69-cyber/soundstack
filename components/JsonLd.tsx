import type { Deal } from "@/lib/types";
import { getSiteUrl, siteDescription, siteName } from "@/lib/site";

function offerFor(deal: Deal) {
  if (deal.priceStatus !== "verified" || deal.price == null || !deal.currency) {
    return undefined;
  }

  return {
    "@type": "Offer",
    price: deal.price,
    priceCurrency: deal.currency,
    url: deal.url,
    availability: "https://schema.org/InStock",
  };
}

export function JsonLd({ deals }: { deals: Deal[] }) {
  const site = getSiteUrl();
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${site}/#website`,
        name: siteName,
        url: site,
        description: siteDescription,
      },
      {
        "@type": "Organization",
        "@id": `${site}/#organization`,
        name: siteName,
        url: site,
        description: siteDescription,
      },
      {
        "@type": "ItemList",
        "@id": `${site}/#deals`,
        name: "SoundStack deals",
        numberOfItems: deals.length,
        itemListElement: deals.map((deal, index) => {
          const offer = offerFor(deal);
          return {
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "Product",
              name: `${deal.vendor} ${deal.title}`,
              description: deal.blurb,
              category: deal.category,
              brand: {
                "@type": "Brand",
                name: deal.vendor,
              },
              url: deal.url,
              ...(offer ? { offers: offer } : {}),
            },
          };
        }),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }}
    />
  );
}
