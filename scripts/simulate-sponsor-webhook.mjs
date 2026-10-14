/**
 * Sign a checkout.session.completed payload and POST it to the local app.
 *
 *   STRIPE_WEBHOOK_SECRET=whsec_... node scripts/simulate-sponsor-webhook.mjs
 *   STRIPE_WEBHOOK_SECRET=whsec_... node scripts/simulate-sponsor-webhook.mjs --url http://127.0.0.1:3000/api/stripe/webhook
 *
 * The secret must match the server. For a run without Vercel Blob, start
 * the app with SPONSOR_STORE=memory (development only) plus
 * OWNER_ALERT_EMAIL and RESEND_API_KEY. `npm test` runs the same signed
 * event in-process and does not need a server.
 */
import Stripe from "stripe";

const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
if (!secret) {
  console.error("Set STRIPE_WEBHOOK_SECRET to the same value the server uses.");
  process.exit(1);
}

const urlFlag = process.argv.indexOf("--url");
const url =
  (urlFlag >= 0 ? process.argv[urlFlag + 1] : process.env.WEBHOOK_URL) ||
  "http://127.0.0.1:3000/api/stripe/webhook";

const created = Math.floor(Date.now() / 1000);
const event = {
  id: "evt_simulate_sponsor",
  object: "event",
  api_version: "2026-01-28.clover",
  created,
  livemode: false,
  pending_webhooks: 1,
  request: { id: null, idempotency_key: null },
  type: "checkout.session.completed",
  data: {
    object: {
      id: `cs_test_sim_${created}`,
      object: "checkout.session",
      created,
      payment_status: "paid",
      amount_total: 14900,
      currency: "usd",
      customer_details: { email: "buyer@example.com" },
      custom_fields: [
        {
          key: "product_name",
          label: { type: "custom", custom: "Product name" },
          type: "text",
          text: { value: "Tape Stop" },
        },
        {
          key: "product_url",
          label: { type: "custom", custom: "Product URL" },
          type: "text",
          text: { value: "https://example.com/tape-stop" },
        },
      ],
    },
  },
};

const payload = JSON.stringify(event);
const stripe = new Stripe("sk_test_webhook_signature_only");
const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });

let response;
try {
  response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });
} catch (error) {
  console.error(`Could not reach ${url}.`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const body = await response.text();
console.log(`${response.status} ${url}`);
console.log(body);
process.exit(response.ok ? 0 : 1);
