# SoundStack

Curated radar for music producer deals, free presets, and boutique soundware.

The site is a Next.js App Router app (TypeScript, Tailwind CSS). It deploys on Vercel with no extra config file: push the repo, import the project, and set the environment variables below.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run lint` and `npm run build` are the checks to run before deploying.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | For production metadata | Origin used by the sitemap, robots.txt, Open Graph, and JSON-LD. Falls back to `http://localhost:3000`. |
| `RESEND_API_KEY` | For newsletter signup | Resend API key. If this or the audience id is missing, `POST /api/newsletter` returns 503. |
| `RESEND_AUDIENCE_ID` | For newsletter signup | Passed to `resend.contacts.create({ audienceId })`. Resend now calls audiences "segments"; the SDK still accepts this legacy id. |
| `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` | For the sponsor button | Stripe Payment Link URL. Inlined at build time. If unset or not an http(s) URL, the "Feature Your Plugin / Pack ($149)" button renders disabled. |
| `STRIPE_WEBHOOK_SECRET` | For `POST /api/stripe/webhook` | Signing secret (`whsec_...`). The route verifies the `Stripe-Signature` header with `Stripe.webhooks.constructEvent`. No Stripe secret key is used. If unset, the route returns 503. |

On Vercel, add these under Project Settings → Environment Variables, then redeploy. `NEXT_PUBLIC_*` values are baked in at build time, so change them and build again.

Point the Stripe webhook at `https://<your-domain>/api/stripe/webhook` and subscribe to `checkout.session.completed`. A verified event is logged as JSON. It is not written to a database yet. See the TODO in `app/api/stripe/webhook/route.ts`.

## Deal data

Listings live in [`data/deals.json`](data/deals.json), a JSON array a daily script can append to. `lib/deals.ts` validates the file when the app builds.

Required on each object:

- `id` (string, unique)
- `title`, `vendor` (strings)
- `category`: `VST Plugins`, `Free Synth Presets`, or `Underground Sample Packs`
- `url` (absolute http or https)
- `isFree` (boolean)
- `tags` (string array)
- `addedAt` (ISO-8601 UTC, e.g. `2026-10-14T12:00:00.000Z`)
- `featured` (boolean)

Nullable, and safe to omit (treated as null):

- `price`, `originalPrice` — numeric strings such as `"249"` or `"24.99"`, never a currency symbol
- `discount` — a percent string such as `"70%"`
- `expiresAt`, `featuredUntil` — ISO-8601 UTC or null

Optional:

- `currency`: `USD`, `EUR`, or `GBP`
- `priceStatus`: `verified`, `approximate`, or `unlisted`. If you set `price` and omit `priceStatus`, the parser marks it `approximate` so an unverified number is not presented as confirmed.
- `blurb`, `priceNote` (short strings)

Append example:

```js
import { readFileSync, writeFileSync } from "node:fs";

const file = "data/deals.json";
const deals = JSON.parse(readFileSync(file, "utf8"));
deals.push({
  id: "vendor-product",
  title: "Product",
  vendor: "Vendor",
  category: "VST Plugins",
  url: "https://example.com/product",
  price: "49",
  currency: "USD",
  priceStatus: "verified",
  isFree: false,
  tags: ["synth"],
  addedAt: new Date().toISOString(),
  featured: false,
});
writeFileSync(file, JSON.stringify(deals, null, 2) + "\n");
```

Prices in the seed file were checked on 14 October 2026. Anything that could not be confirmed is called out in the pull request, and those cards either omit the price or carry a `priceNote`.

## Discoverability

- JSON-LD (`WebSite`, `Organization`, `ItemList`) on the homepage
- [`public/llms.txt`](public/llms.txt)
- `app/sitemap.ts` and `app/robots.ts`
- Open Graph metadata and a generated share image

## Deploy

Import the GitHub repo in Vercel. Framework preset is Next.js. No `vercel.json` is required. Set the environment variables, then deploy.
