import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import Stripe from "stripe";
import { GET, POST as markIncluded } from "@/app/api/sponsors/active/route";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import {
  setSponsorMailerForTests,
  type SponsorEmail,
} from "@/lib/sponsor-mail";
import {
  isSponsorStoreConfigured,
  listSponsors,
  resetSponsorStoreForTests,
  saveSponsor,
} from "@/lib/sponsor-store";
import {
  mergeSponsorsIntoDeals,
  SPONSOR_FEATURED_DAYS,
  SPONSOR_LINK_REL,
  sponsorFromCheckout,
  type Sponsor,
} from "@/lib/sponsors";
import type { Deal } from "@/lib/types";

const SECRET = "whsec_test_soundstack";
const ADMIN = "admin-test-token";
const stripe = new Stripe("sk_test_webhook_signature_only");

let sent: SponsorEmail[] = [];

beforeEach(() => {
  sent = [];
  resetSponsorStoreForTests();
  process.env.SPONSOR_STORE = "memory";
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  process.env.OWNER_ALERT_EMAIL = "owner@example.com";
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.RESEND_FROM = "SoundStack <onboarding@resend.dev>";
  process.env.ADMIN_TOKEN = ADMIN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  setSponsorMailerForTests(async (email) => {
    sent.push(email);
  });
});

afterEach(() => {
  setSponsorMailerForTests(null);
  resetSponsorStoreForTests();
});

test("paid checkout uses product_name, product_url, and a 7-day window", () => {
  const parsed = sponsorFromCheckout({
    id: "cs_test_fixed",
    created: Math.floor(Date.UTC(2026, 9, 14, 12) / 1000),
    payment_status: "paid",
    amount_total: 14900,
    currency: "usd",
    customer_details: { email: "Buyer@Example.com" },
    custom_fields: [
      { key: "product_name", text: { value: "Tape Stop" } },
      { key: "product_url", text: { value: "example.com/tape-stop" } },
    ],
  });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.sponsor.name, "Tape Stop");
  assert.equal(parsed.sponsor.url, "https://example.com/tape-stop");
  assert.equal(parsed.sponsor.email, "buyer@example.com");
  assert.equal(parsed.sponsor.amountTotal, 14900);
  assert.equal(parsed.sponsor.paidAt, "2026-10-14");
  assert.equal(parsed.sponsor.featuredUntil, "2026-10-21");
  assert.equal(SPONSOR_FEATURED_DAYS, 7);
  assert.equal(parsed.sponsor.includedInNewsletter, false);
  assert.equal(parsed.sponsor.ownerAlertSent, false);
  assert.equal(parsed.sponsor.buyerAlertSent, false);
});

test("unpaid checkout is not a sponsor", () => {
  const parsed = sponsorFromCheckout({
    id: "cs_test_unpaid",
    created: 1_760_400_000,
    payment_status: "unpaid",
    custom_fields: [
      { key: "product_name", text: { value: "Tape Stop" } },
      { key: "product_url", text: { value: "https://example.com/tape-stop" } },
    ],
  });
  assert.deepEqual(parsed, { ok: false, reason: "unpaid" });
});

test("active sponsors pin in paid order and expire when featuredUntil is today", () => {
  const curated = sampleDeal({
    id: "curated",
    title: "Curated",
    url: "https://vendor.example/curated",
  });
  const early = sampleSponsor({
    id: "cs_test_early",
    name: "Early",
    url: "https://early.example/a",
    paidAt: "2026-10-01",
    featuredUntil: "2026-10-08",
  });
  const late = sampleSponsor({
    id: "cs_test_late",
    name: "Late",
    url: "https://late.example/b",
    paidAt: "2026-10-03",
    featuredUntil: "2026-10-10",
  });

  const pinned = mergeSponsorsIntoDeals(
    [curated],
    [late, early],
    "2026-10-05",
  );
  assert.deepEqual(
    pinned.map((deal) => deal.title),
    ["Early", "Late", "Curated"],
  );
  assert.equal(pinned[0].sponsored, true);
  assert.equal(pinned[1].sponsored, true);
  assert.equal(pinned[2].sponsored, undefined);

  const expired = mergeSponsorsIntoDeals([curated], [early], "2026-10-08");
  assert.equal(expired.length, 1);
  assert.equal(expired[0].id, "curated");

  const sameUrl = mergeSponsorsIntoDeals(
    [],
    [
      sampleSponsor({
        id: "cs_test_second",
        name: "Second",
        url: "https://example.com/same/",
        paidAt: "2026-10-02",
        featuredUntil: "2026-10-09",
      }),
      sampleSponsor({
        id: "cs_test_first",
        name: "First",
        url: "https://example.com/same",
        paidAt: "2026-10-01",
        featuredUntil: "2026-10-08",
      }),
    ],
    "2026-10-03",
  );
  assert.equal(sameUrl.length, 1);
  assert.equal(sameUrl[0].title, "First");
  assert.equal(sameUrl[0].featuredUntil, "2026-10-09");
  assert.equal(sameUrl[0].sponsored, true);
  assert.equal(SPONSOR_LINK_REL, "sponsored noopener");

  const openEnded = mergeSponsorsIntoDeals(
    [
      sampleDeal({
        id: "forever",
        title: "Forever",
        url: "https://example.com/forever",
        featured: true,
        featuredUntil: null,
      }),
    ],
    [
      sampleSponsor({
        id: "cs_test_forever",
        name: "Forever",
        url: "https://example.com/forever",
        paidAt: "2026-10-01",
        featuredUntil: "2026-10-08",
      }),
    ],
    "2026-10-03",
  );
  assert.equal(openEnded[0].sponsored, true);
  assert.equal(openEnded[0].featuredUntil, null);
});

test("signed webhook stores one sponsor and sends both emails once", async () => {
  const response = await postWebhook(checkoutEvent());
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.featured, true);
  assert.equal(body.ownerAlerted, true);
  assert.equal(body.buyerAlerted, true);

  const stored = await listSponsors();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].name, "Tape Stop");
  assert.equal(stored[0].includedInNewsletter, false);
  assert.equal(stored[0].ownerAlertSent, true);
  assert.equal(stored[0].buyerAlertSent, true);

  assert.equal(sent.length, 2);
  assert.equal(sent[0].to, "owner@example.com");
  assert.equal(sent[0].from, "SoundStack <onboarding@resend.dev>");
  assert.equal(sent[0].subject, "You made $149 from Tape Stop");
  assert.equal(sent[1].to, "buyer@example.com");
  assert.match(sent[1].subject, /confirmed/i);
  assert.match(sent[1].text, /7 days/);

  const replay = await postWebhook(checkoutEvent());
  assert.equal(replay.status, 200);
  const replayBody = await replay.json();
  assert.equal(replayBody.idempotent, true);
  assert.equal((await listSponsors()).length, 1);
  assert.equal(sent.length, 2);
});

test("a bad signature does not store a sponsor", async () => {
  const response = await postWebhook(checkoutEvent(), "whsec_wrong");
  assert.equal(response.status, 400);
  assert.equal((await listSponsors()).length, 0);
  assert.equal(sent.length, 0);
});

test("admin API lists unincluded sponsors and marks them included", async () => {
  assert.equal((await postWebhook(checkoutEvent())).status, 200);

  const anonymous = await GET(new Request("http://localhost/api/sponsors/active"));
  assert.equal(anonymous.status, 401);

  const wrong = await GET(
    new Request("http://localhost/api/sponsors/active", {
      headers: { authorization: "Bearer nope" },
    }),
  );
  assert.equal(wrong.status, 401);

  const listed = await GET(adminRequest("/api/sponsors/active"));
  assert.equal(listed.status, 200);
  const listedBody = await listed.json();
  assert.equal(listedBody.sponsors.length, 1);
  assert.equal(listedBody.sponsors[0].name, "Tape Stop");
  assert.equal(listedBody.sponsors[0].amount, 14900);
  assert.equal(listedBody.sponsors[0].includedInNewsletter, false);
  assert.equal(listed.headers.get("cache-control"), "no-store");

  const marked = await markIncluded(
    adminRequest("/api/sponsors/active", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [listedBody.sponsors[0].id] }),
    }),
  );
  assert.equal(marked.status, 200);
  const markedBody = await marked.json();
  assert.deepEqual(markedBody.included, [listedBody.sponsors[0].id]);
  assert.deepEqual(markedBody.missing, []);

  const after = await GET(adminRequest("/api/sponsors/active"));
  const afterBody = await after.json();
  assert.deepEqual(afterBody.sponsors, []);

  assert.equal((await postWebhook(checkoutEvent())).status, 200);
  const still = await GET(adminRequest("/api/sponsors/active"));
  const stillBody = await still.json();
  assert.deepEqual(stillBody.sponsors, []);
  assert.equal((await listSponsors())[0].includedInNewsletter, true);
});

test("expired sponsors are left out of the newsletter list", async () => {
  const today = new Date().toISOString().slice(0, 10);
  await saveSponsor(
    sampleSponsor({
      id: "cs_test_expired",
      name: "Expired",
      url: "https://example.com/expired",
      paidAt: "2020-01-01",
      featuredUntil: today,
    }),
  );

  const listed = await GET(adminRequest("/api/sponsors/active"));
  const body = await listed.json();
  assert.deepEqual(body.sponsors, []);
});

test("memory store is disabled in production", () => {
  const previous = process.env.NODE_ENV;
  writeNodeEnv("production");
  process.env.SPONSOR_STORE = "memory";
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  try {
    assert.equal(isSponsorStoreConfigured(), false);
  } finally {
    writeNodeEnv(previous);
  }
});

test("admin API reports that it is not configured", async () => {
  delete process.env.ADMIN_TOKEN;
  const response = await GET(
    new Request("http://localhost/api/sponsors/active", {
      headers: { authorization: "Bearer anything" },
    }),
  );
  assert.equal(response.status, 503);
});

function writeNodeEnv(value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = value;
}

function checkoutEvent(id = "cs_test_tape") {
  const created = Math.floor(Date.now() / 1000);
  return {
    id: "evt_test_sponsor",
    object: "event",
    api_version: "2026-01-28.clover",
    created,
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: "checkout.session.completed",
    data: {
      object: {
        id,
        object: "checkout.session",
        created,
        payment_status: "paid",
        amount_total: 14900,
        currency: "usd",
        customer_details: { email: "Buyer@Example.com" },
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
}

async function postWebhook(event: unknown, secret = SECRET) {
  const payload = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  return webhook(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: {
        "stripe-signature": signature,
        "content-type": "application/json",
      },
      body: payload,
    }),
  );
}

function adminRequest(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${ADMIN}`);
  return new Request(`http://localhost${path}`, { ...init, headers });
}

function sampleDeal(
  partial: Pick<Deal, "id" | "title" | "url"> & Partial<Deal>,
): Deal {
  return {
    vendor: "Vendor",
    category: "VST Plugins",
    price: null,
    originalPrice: null,
    discount: null,
    isFree: false,
    tags: [],
    addedAt: "2026-10-01",
    expiresAt: null,
    featured: false,
    featuredUntil: null,
    ...partial,
  };
}

function sampleSponsor(
  partial: Pick<Sponsor, "id" | "name" | "url" | "paidAt" | "featuredUntil"> &
    Partial<Sponsor>,
): Sponsor {
  return {
    email: "buyer@example.com",
    amountTotal: 14900,
    currency: "usd",
    vendor: "example.com",
    category: "VST Plugins",
    includedInNewsletter: false,
    ownerAlertSent: false,
    buyerAlertSent: false,
    ...partial,
  };
}
