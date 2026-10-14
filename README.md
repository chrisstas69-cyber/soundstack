# SoundStack

Curated deal radar for music producers: daily audio plugin sales, free synth presets, and boutique soundware.

The homepage is a dark, searchable list of 25 checked listings in three categories: VST Plugins, Free Synth Presets, and Underground Sample Packs. Prices come from vendor pages. A discount is stored only when the vendor publishes a compare-at price.

## Stack

Next.js App Router, TypeScript, and Tailwind CSS. Deploy it on Vercel with the default settings. No extra config file is required. The root layout includes Vercel Web Analytics (`@vercel/analytics`). Enable Web Analytics on the Vercel project; the package does not need an env var.

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
| `STRIPE_SECRET_KEY` | Optional | Not used. Signature checks and sponsor persistence both use the webhook payload. |
| `BLOB_STORE_ID` | For sponsor persistence on Vercel | Private [Vercel Blob](https://vercel.com/docs/vercel-blob) store id. Connecting the store to the project sets this and `VERCEL_OIDC_TOKEN` (issued automatically; do not copy it into the repo). |
| `BLOB_READ_WRITE_TOKEN` | For sponsor persistence outside Vercel | Static Blob read-write token. The SDK uses it when `BLOB_STORE_ID` and `VERCEL_OIDC_TOKEN` are not both set. |

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

The header CTA reads **Feature Your Plugin / Pack ($149)** and opens the Stripe Payment Link.

A verified `checkout.session.completed` (and `checkout.session.async_payment_succeeded`) with `payment_status: paid` writes the sponsor to a private Vercel Blob at `sponsors/featured.json`. The homepage reads that document and pins the listing at the top of the radar with the Featured badge through `featuredUntil`: the checkout UTC date plus 30 days, inclusive. The sponsorship fee is not shown as the product price. When the URL matches a row already in `data/deals.json`, that row is pinned and its feature window is extended instead of adding a second card. Expired sponsors stay in the blob and drop off the radar.

Blob is used instead of Global Config (formerly Edge Config) because each checkout is a write of buyer data. Global Config is a read-optimized config store. Create a **private** Blob store so the stored email is not readable from a public URL. Without Blob credentials the radar still renders the curated list, and the webhook returns 500 so Stripe retries after the store is connected.

### Payment Link

The static header link cannot pass a different name and URL for each buyer. Collect them on the Payment Link.

In the Stripe Dashboard, edit the Payment Link used by `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` and add two **required** text custom fields:

| Label | Key | Buyer enters |
| --- | --- | --- |
| Plugin or pack name | `pluginname` | Listing title |
| Plugin or pack URL | `pluginurl` | `https://` product page, or a host that will be stored as `https://` |

Set the keys explicitly when creating the link with the API (`custom_fields[].key`). In the Dashboard, Stripe may derive the key from the label. Either key above works, and so do `plugin_name` / `plugin_url`. If the key differs, the labels still match when they read "Plugin or pack name" and "Plugin or pack URL".

Optional fields:

- `category` — one of `VST Plugins`, `Free Synth Presets`, `Underground Sample Packs`. Anything else is filed under VST Plugins.
- `vendor` — brand shown under the title. Without it, the hostname of the URL is used.

Point the webhook endpoint at `https://<your-domain>/api/stripe/webhook` and subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.

If you create Checkout Sessions in code instead of a Payment Link, send the same values on `metadata` (`pluginname`, `pluginurl`) or set `client_reference_id` to `Plugin name|https://example.com/product`. A Payment Link also copies a `client_reference_id` query parameter onto the session. Custom fields win when more than one source is present. A paid session that still has no name or https URL is acknowledged and not featured; fixing the Payment Link does not backfill that session.

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
