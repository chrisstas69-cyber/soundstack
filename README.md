# SoundStack

Curated deal radar for music producers: daily audio plugin sales, free synth presets, and boutique soundware.

The homepage is a dark, searchable list of 25 checked listings in three categories: VST Plugins, Free Synth Presets, and Underground Sample Packs. Prices come from vendor pages. A discount is stored only when the vendor publishes a compare-at price.

## Stack

Next.js App Router, TypeScript, and Tailwind CSS. Deploy it on Vercel with the default settings. No extra config file is required.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The radar, search, and category chips work without env vars. The sponsor button stays hidden until `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` is an `https://` URL. Newsletter signup returns a clear error until the Resend variables are set.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | For correct metadata | Canonical origin for Open Graph, sitemap, robots, and JSON-LD. Inlined at build time. |
| `RESEND_API_KEY` | For newsletter | Resend API key used by `POST /api/newsletter`. |
| `RESEND_AUDIENCE_ID` | For newsletter | Audience id. If Resend rejects the legacy audience call, the route retries with the same id as a segment. |
| `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` | For the sponsor CTA | Stripe Payment Link. The header link is omitted when this is empty. |
| `STRIPE_WEBHOOK_SECRET` | For the webhook | Verifies `POST /api/stripe/webhook`. |
| `STRIPE_SECRET_KEY` | Optional | Not used for signature checks. Reserved for later sponsor persistence. |

## Daily deals

Append an object to the array in `data/deals.json`. Keep ids unique. Dates are `YYYY-MM-DD`. Use `null` for unknown prices, discounts, and expirations.

```json
{
  "id": "example-pack",
  "title": "Example Pack",
  "vendor": "Example",
  "category": "Underground Sample Packs",
  "url": "https://example.com/pack",
  "price": 19,
  "originalPrice": 29,
  "discount": "34%",
  "isFree": false,
  "tags": ["samples"],
  "addedAt": "2026-10-15",
  "expiresAt": null,
  "featured": false,
  "featuredUntil": null,
  "currency": "USD",
  "priceStatus": "sale",
  "priceNote": "Where the numbers were checked."
}
```

`category` must be one of `VST Plugins`, `Free Synth Presets`, or `Underground Sample Packs`.

`priceStatus` is `list`, `sale`, `free`, or `omitted`. Do not invent a markdown. Paid preset packs from boutique labels are filed under Underground Sample Packs and tagged `presets`, because Free Synth Presets is only for verified free packs.

## Sponsorship

The header CTA reads **Feature Your Plugin / Pack ($149)** and opens the Stripe Payment Link. Point Stripe at `https://<your-domain>/api/stripe/webhook` for `checkout.session.completed`. The route verifies the signature and logs the sponsor. Persisting that checkout is still a TODO in the route.

## Discoverability

- JSON-LD on the homepage: `WebSite`, `Organization`, and an `ItemList` of deals
- `public/llms.txt`
- `/sitemap.xml` and `/robots.txt` from Next metadata routes
- Open Graph metadata and a generated share image

If the production domain is not `https://soundstack.vercel.app`, set `NEXT_PUBLIC_SITE_URL` and update the absolute links in `public/llms.txt`.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```
