# SoundStack

Curated deal radar for music producers: daily audio plugin sales, free synth presets, and boutique soundware.

The homepage is a dark, searchable list of 51 checked listings in three categories: VST Plugins, Free Synth Presets, and Underground Sample Packs. Prices come from vendor pages. A discount is stored only when the vendor publishes a compare-at price.

## Stack

Next.js App Router, TypeScript, and Tailwind CSS. Deploy it on Vercel with the default settings. No extra config file is required. The root layout includes Vercel Web Analytics (`@vercel/analytics`). Enable Web Analytics on the Vercel project; the package does not need an env var.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The radar, search, and category chips work without env vars. Sponsorship defaults to free mode: the header links to `/advertise`. Set `NEXT_PUBLIC_SPONSOR_MODE=paid` and rebuild to use the Stripe Payment Links. In paid mode the sponsor button stays hidden until `NEXT_PUBLIC_STRIPE_FOUNDING_LINK`, `NEXT_PUBLIC_STRIPE_FULL_LINK`, or `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` is an `https://` URL. Newsletter signup returns a clear error until the Resend variables are set. The free feature form returns a clear error until `RESEND_API_KEY` and `OWNER_ALERT_EMAIL` are set.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | For correct metadata | Canonical origin for Open Graph, sitemap, robots, and JSON-LD. Inlined at build time. |
| `RESEND_API_KEY` | For newsletter and sponsor email | Resend API key used by `POST /api/newsletter`, the sponsor alerts, and free feature requests. |
| `RESEND_AUDIENCE_ID` | For newsletter | Audience id. If Resend rejects the legacy audience call, the route retries with the same id as a segment. |
| `OWNER_ALERT_EMAIL` | For the owner alert | Inbox for `You made $79 from <Sponsor>` after a paid checkout, and for `New free feature request: <name>` from the free form. The dollar amount is the Checkout Session total, so a $149 payment says $149. With the default from address, Resend only delivers to the account email, so use that address here until `RESEND_FROM` is verified. |
| `RESEND_FROM` | Optional | From address for sponsor emails and free feature requests. Defaults to `onboarding@resend.dev`. Set a verified domain address (for example `SoundStack <alerts@yourdomain.com>`) so the buyer confirmation can leave the Resend sandbox. |
| `ADMIN_TOKEN` | For the sponsor API | Bearer token for `GET` and `POST /api/sponsors/active`, and for `POST /api/sponsors/free`. |
| `NEXT_PUBLIC_SPONSOR_MODE` | Optional | `free` (default when unset) or `paid`. Free mode shows **Get Your Plugin Featured (Free)** and the request form. `paid` restores the Stripe CTAs. Inlined at build time. |
| `NEXT_PUBLIC_STRIPE_FOUNDING_LINK` | For the $79 CTA | Stripe Payment Link for the first 5 sponsors ($79, 7 days). When this is an https URL, the header reads **Feature Your Plugin ($79 founding, reg. $149)**. |
| `NEXT_PUBLIC_STRIPE_FULL_LINK` | For the $149 CTA | Stripe Payment Link for the standard rate ($149, 7 days). The header uses this when the founding link is unset. |
| `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` | Legacy | Currently the founding checkout. The header uses it only when neither link above is an https URL. |
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
  "priceNote": "Where the numbers were checked.",
  "image": "/deals/example-pack.jpg",
  "imageSource": "https://example.com/og-image.jpg"
}
```

`category` must be one of `VST Plugins`, `Free Synth Presets`, or `Underground Sample Packs`.

`priceStatus` is `list`, `sale`, `free`, or `omitted`. Do not invent a markdown. Paid preset packs from boutique labels are filed under Underground Sample Packs and tagged `presets`, because Free Synth Presets is only for verified free packs.

`image` is an optional cover or box shot in `public/deals/`. `imageSource` records the vendor URL it came from, usually the product page `og:image`. A card with no image shows the vendor's initial.

## Sponsorship

`NEXT_PUBLIC_SPONSOR_MODE` chooses the public offer. `free` is the default when the variable is unset. `paid` restores the Stripe checkout below. The value is inlined at build time, so change it and rebuild to switch.

### Free mode

The header CTA reads **Get Your Plugin Featured (Free)** and goes to `/advertise`. Stripe buttons are hidden. The Payment Link helpers, webhook, and blob writer stay in the repo, so `paid` mode brings today's checkout back without another code change.

`/advertise` explains the early-partner offer: 7 days pinned, a newsletter mention, and we ask only that they share the listing. The page says paid slots at $149/week are coming later.

The form collects a product name, product URL, contact email, and a short note. `POST /api/sponsors/feature-request` emails `OWNER_ALERT_EMAIL` through Resend. The from address is `RESEND_FROM`, or `onboarding@resend.dev` when that is unset. The subject is `New free feature request: <name>`.

Spam protection is a honeypot field named `ss_hp` plus an in-memory limit of 5 requests per hour per IP. A filled honeypot returns success and does not send mail. The limit lives in the server process, so it is per instance.

The form does not publish the listing. To approve one:

```bash
curl -X POST https://<your-domain>/api/sponsors/free \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Tape Stop","url":"https://example.com/tape-stop","email":"maker@example.com","days":7}'
```

`days` defaults to 7 and must be a whole number from 1 to 90. The route writes the same private blob as a paid checkout (`sponsors/featured.json`) with `amountTotal: 0` and an id that starts with `free_`. The homepage pins it in paid order for that window. The card is labeled **Featured** when the amount is 0, and **Sponsored** when the amount is anything else. The outbound link uses `rel="sponsored noopener"` only for a paid amount.

Without `ADMIN_TOKEN` the route returns 503. A missing or wrong bearer token returns 401.

### Paid mode

The header CTA reads **Feature Your Plugin ($79 founding, reg. $149)** and opens `NEXT_PUBLIC_STRIPE_FOUNDING_LINK`. When that variable is unset, the header falls back to **Feature Your Plugin / Pack ($149)** and `NEXT_PUBLIC_STRIPE_FULL_LINK`.

`/advertise` explains the offer: 7 days pinned at #1, plus the next newsletter, for music producers hunting plugin deals. It shows both prices and a button for each Payment Link. The founding rate is the first 5 sponsors.

A verified `checkout.session.completed` (and `checkout.session.async_payment_succeeded`) with `payment_status: paid` writes the sponsor to a private Vercel Blob at `sponsors/featured.json`. The write is idempotent on the Checkout Session id: a retry keeps `includedInNewsletter` and does not send the emails again.

The stored record has the product name, https URL, buyer email, amount in the smallest currency unit (`amountTotal`, so `14900` for $149), `paidAt`, `featuredUntil` (`paidAt` plus 7 days), and `includedInNewsletter: false`. The homepage reads that document on each request and pins every active sponsor at the top of the radar. A sponsor is active while `featuredUntil` is still in the future (UTC), so a checkout on 14 Oct is shown on the 14th through the 20th and drops off on the 21st. No redeploy is required.

Active sponsors are ordered by `paidAt`, earliest payment in the #1 slot. A second payment for the same URL does not add another card; the listing stays up through the later `featuredUntil`. A paid card is labeled **Sponsored** and the outbound link uses `rel="sponsored noopener"`. A row with `amountTotal: 0` is labeled **Featured** and uses a normal outbound link. The sponsorship fee is not shown as the product price. When the URL matches a row already in `data/deals.json`, that row is pinned instead of adding a second card. Expired sponsors stay in the blob and drop off the radar.

After the write, Resend emails `OWNER_ALERT_EMAIL` with the subject `You made $79 from <Sponsor>` (or `$149` when that is what the Checkout Session charged) and sends the buyer a confirmation that names the same amount. Neither email hard-codes $149. The from address is `RESEND_FROM` or `onboarding@resend.dev`. If the owner alert cannot be sent, the webhook returns 500 so Stripe retries; the listing is already stored. A buyer-mail failure is logged and does not fail the webhook.

Point the Payment Link's confirmation redirect at `https://<your-domain>/?sponsored=1`. That URL shows a thank-you banner. Search and category changes keep the `sponsored` query so the banner stays up.

Blob is used instead of Global Config (formerly Edge Config) because each checkout is a write of buyer data. Global Config is a read-optimized config store. Create a **private** Blob store so the stored email is not readable from a public URL. Without Blob credentials the radar still renders the curated list, and the webhook returns 500 so Stripe retries after the store is connected.

### Payment Link

The static header link cannot pass a different name and URL for each buyer. Collect them on the Payment Link.

In the Stripe Dashboard, edit each Payment Link (`NEXT_PUBLIC_STRIPE_FOUNDING_LINK`, `NEXT_PUBLIC_STRIPE_FULL_LINK`, and the legacy `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`) and add two **required** text custom fields:

| Label | Key | Buyer enters |
| --- | --- | --- |
| Product name | `product_name` | Listing title |
| Product URL | `product_url` | `https://` product page, or a host that will be stored as `https://` |

`pluginname` / `pluginurl` and `plugin_name` / `plugin_url` still work. If the key differs, labels that mention a name or a URL are used.

Optional fields:

- `category` — one of `VST Plugins`, `Free Synth Presets`, `Underground Sample Packs`. Anything else is filed under VST Plugins.
- `vendor` — brand shown under the title. Without it, the hostname of the URL is used.

Point the webhook endpoint at `https://<your-domain>/api/stripe/webhook` and subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.

If you create Checkout Sessions in code instead of a Payment Link, send the same values on `metadata` (`product_name`, `product_url`) or set `client_reference_id` to `Plugin name|https://example.com/product`. A Payment Link also copies a `client_reference_id` query parameter onto the session. Custom fields win when more than one source is present. A paid session that still has no name or https URL is acknowledged and not featured; fixing the Payment Link does not backfill that session.

### Newsletter inclusion

`GET /api/sponsors/active` with `Authorization: Bearer $ADMIN_TOKEN` returns active sponsors that are not yet included in the newsletter, in paid order:

```json
{
  "sponsors": [
    {
      "id": "cs_test_...",
      "name": "Tape Stop",
      "url": "https://example.com/tape-stop",
      "email": "buyer@example.com",
      "amount": 14900,
      "currency": "usd",
      "paidAt": "2026-10-14",
      "featuredUntil": "2026-10-21",
      "includedInNewsletter": false
    }
  ]
}
```

`amount` is Stripe `amount_total` in the smallest currency unit, or `0` for a complimentary feature. `POST` the same path with `{ "ids": ["cs_test_..."] }` to set `includedInNewsletter` on those sessions. Complimentary ids start with `free_` and are accepted by the same call. Marking an id again is a no-op. The response lists `included` and `missing`. Without `ADMIN_TOKEN` the route returns 503. A missing or wrong bearer token returns 401. Responses send `Cache-Control: no-store`.

## Discoverability

- JSON-LD on the homepage: `WebSite`, `Organization`, and an `ItemList` of deals
- `public/llms.txt`
- `/sitemap.xml` and `/robots.txt` from Next metadata routes
- Open Graph metadata and a generated share image

If the production domain is not `https://soundstack.vercel.app`, set `NEXT_PUBLIC_SITE_URL` and update the absolute links in `public/llms.txt`.

## Scripts

```bash
npm run dev
npm test
npm run lint
npm run build
```

`npm test` signs a `checkout.session.completed` event and runs the webhook, homepage merge, and admin API in memory. To hit a running dev server instead:

```bash
SPONSOR_STORE=memory \
STRIPE_WEBHOOK_SECRET=whsec_test \
OWNER_ALERT_EMAIL=you@example.com \
RESEND_API_KEY=re_... \
ADMIN_TOKEN=dev-token \
npm run dev
```

```bash
STRIPE_WEBHOOK_SECRET=whsec_test npm run simulate:webhook
```

`SPONSOR_STORE=memory` is for local development only. Production ignores it.
