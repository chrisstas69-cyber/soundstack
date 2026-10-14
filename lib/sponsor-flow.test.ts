import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import Stripe from "stripe";
import { GET, POST as markIncluded } from "@/app/api/sponsors/active/route";
import { POST as approveFree } from "@/app/api/sponsors/free/route";
import { POST as requestFeature } from "@/app/api/sponsors/feature-request/route";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import { FEATURE_REQUEST_LIMIT, resetRateLimitForTests } from "@/lib/rate-limit";
import {
  formatCheckoutAmount,
  freeFeatureRequestDraft,
  setSponsorMailerForTests,
  sponsorEmailDrafts,
  type SponsorEmail,
} from "@/lib/sponsor-mail";
import {
  headerSponsorCta,
  headerSponsorCtaForMode,
  headerSponsorCtaFromLinks,
  sponsorModeFrom,
} from "@/lib/site";
import {
  isSponsorStoreConfigured,
  listSponsors,
  resetSponsorStoreForTests,
  saveSponsor,
} from "@/lib/sponsor-store";
import {
  addUtcDays,
  mergeSponsorsIntoDeals,
  parseSponsorStore,
  serializeSponsorStore,
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
  delete process.env.NEXT_PUBLIC_SPONSOR_MODE;
  resetRateLimitForTests();
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
  assert.match(sent[0].text, /You made \$149 from Tape Stop/);
  assert.equal(sent[1].to, "buyer@example.com");
  assert.equal(sent[1].subject, "Your $149 SoundStack sponsorship is confirmed");
  assert.match(sent[1].text, /Payment received: \$149/);
  assert.match(sent[1].text, /7 days/);

  const replay = await postWebhook(checkoutEvent());
  assert.equal(replay.status, 200);
  const replayBody = await replay.json();
  assert.equal(replayBody.idempotent, true);
  assert.equal((await listSponsors()).length, 1);
  assert.equal(sent.length, 2);
});

test("emails use the Checkout Session amount, including a $79 founding payment", () => {
  const founding = sampleSponsor({
    id: "cs_test_founding",
    name: "Tape Stop",
    url: "https://example.com/tape-stop",
    paidAt: "2026-10-14",
    featuredUntil: "2026-10-21",
    amountTotal: 7900,
    currency: "usd",
  });
  const drafts = sponsorEmailDrafts(
    founding,
    "SoundStack <alerts@example.com>",
    "owner@example.com",
  );

  assert.equal(drafts[0].subject, "You made $79 from Tape Stop");
  assert.match(drafts[0].text, /You made \$79 from Tape Stop/);
  assert.equal(drafts[0].text.includes("$149"), false);
  assert.equal(drafts[1].subject, "Your $79 SoundStack sponsorship is confirmed");
  assert.match(drafts[1].text, /Payment received: \$79/);
  assert.equal(drafts[1].text.includes("$149"), false);

  const cents = sampleSponsor({
    ...founding,
    amountTotal: 7950,
  });
  const odd = sponsorEmailDrafts(cents, "from@example.com", "owner@example.com");
  assert.equal(formatCheckoutAmount(7950, "usd"), "$79.50");
  assert.equal(odd[0].subject, "You made $79.50 from Tape Stop");

  const missing = sampleSponsor({
    ...founding,
    amountTotal: null,
  });
  const blank = sponsorEmailDrafts(missing, "from@example.com", "owner@example.com");
  assert.equal(blank[0].subject, "New SoundStack sponsor: Tape Stop");
  assert.equal(blank[0].subject.includes("$149"), false);
  assert.equal(blank[1].subject, "Your SoundStack sponsorship is confirmed");
  assert.equal(blank[1].text.includes("$149"), false);
});

test("header CTA prefers the founding link and falls back to $149", () => {
  assert.deepEqual(
    headerSponsorCtaFromLinks({
      founding: " https://buy.stripe.com/founding ",
      full: "https://buy.stripe.com/full",
      payment: "https://buy.stripe.com/legacy",
    }),
    {
      href: "https://buy.stripe.com/founding",
      label: "Feature Your Plugin ($79 founding, reg. $149)",
    },
  );

  assert.deepEqual(
    headerSponsorCtaFromLinks({
      founding: "",
      full: "https://buy.stripe.com/full",
      payment: "https://buy.stripe.com/legacy",
    }),
    {
      href: "https://buy.stripe.com/full",
      label: "Feature Your Plugin / Pack ($149)",
    },
  );

  assert.deepEqual(
    headerSponsorCtaFromLinks({
      payment: "https://buy.stripe.com/legacy",
    }),
    {
      href: "https://buy.stripe.com/legacy",
      label: "Feature Your Plugin / Pack ($149)",
    },
  );

  assert.equal(
    headerSponsorCtaFromLinks({
      founding: "http://buy.stripe.com/founding",
      full: "not-a-url",
    }),
    null,
  );
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

test("free mode is the default header CTA and paid mode restores Stripe", () => {
  assert.equal(sponsorModeFrom(undefined), "free");
  assert.equal(sponsorModeFrom("  "), "free");
  assert.equal(sponsorModeFrom("nope"), "free");
  assert.equal(sponsorModeFrom("PAID"), "paid");

  assert.deepEqual(
    headerSponsorCtaForMode("free", {
      founding: "https://buy.stripe.com/founding",
    }),
    {
      href: "/advertise",
      label: "Get Your Plugin Featured (Free)",
    },
  );

  assert.deepEqual(
    headerSponsorCtaForMode("paid", {
      founding: "https://buy.stripe.com/founding",
    }),
    {
      href: "https://buy.stripe.com/founding",
      label: "Feature Your Plugin ($79 founding, reg. $149)",
    },
  );

  const previousMode = process.env.NEXT_PUBLIC_SPONSOR_MODE;
  const previousFounding = process.env.NEXT_PUBLIC_STRIPE_FOUNDING_LINK;
  process.env.NEXT_PUBLIC_STRIPE_FOUNDING_LINK = "https://buy.stripe.com/founding";
  try {
    delete process.env.NEXT_PUBLIC_SPONSOR_MODE;
    assert.deepEqual(headerSponsorCta(), {
      href: "/advertise",
      label: "Get Your Plugin Featured (Free)",
    });
    process.env.NEXT_PUBLIC_SPONSOR_MODE = "paid";
    assert.equal(
      headerSponsorCta()?.href,
      "https://buy.stripe.com/founding",
    );
  } finally {
    restoreEnv("NEXT_PUBLIC_SPONSOR_MODE", previousMode);
    restoreEnv("NEXT_PUBLIC_STRIPE_FOUNDING_LINK", previousFounding);
  }
});

test("a zero-amount sponsor pins and is labeled featured, not sponsored", () => {
  const curated = sampleDeal({
    id: "tape",
    title: "Shelf",
    url: "https://example.com/tape-stop",
  });
  const free = sampleSponsor({
    id: "free_tape",
    name: "Tape Stop",
    url: "https://example.com/tape-stop",
    paidAt: "2026-10-01",
    featuredUntil: "2026-10-08",
    amountTotal: 0,
    currency: "usd",
  });

  const pinned = mergeSponsorsIntoDeals([curated], [free], "2026-10-03");
  assert.equal(pinned[0].id, "tape");
  assert.equal(pinned[0].featured, true);
  assert.equal(pinned[0].sponsored, undefined);
  assert.equal(pinned[0].featuredUntil, "2026-10-08");

  const created = mergeSponsorsIntoDeals([], [free], "2026-10-03");
  assert.equal(created[0].sponsored, undefined);
  assert.equal(created[0].featured, true);
  assert.deepEqual(created[0].tags, ["featured"]);

  const paidLater = sampleSponsor({
    id: "cs_test_tape_paid",
    name: "Tape Stop",
    url: "https://example.com/tape-stop",
    paidAt: "2026-10-02",
    featuredUntil: "2026-10-09",
  });
  const both = mergeSponsorsIntoDeals([], [paidLater, free], "2026-10-03");
  assert.equal(both.length, 1);
  assert.equal(both[0].sponsored, true);
  assert.equal(both[0].featuredUntil, "2026-10-09");

  const roundTrip = parseSponsorStore(serializeSponsorStore([free]));
  assert.equal(roundTrip.length, 1);
  assert.equal(roundTrip[0].amountTotal, 0);
  assert.equal(roundTrip[0].id, "free_tape");
});

test("free feature request emails the owner and drops honeypot and floods", async () => {
  const sentBefore = sent.length;
  const response = await requestFeature(
    jsonRequest("/api/sponsors/feature-request", {
      name: "Tape Stop",
      url: "example.com/tape-stop",
      email: "Maker@Example.com",
      note: "We will share the listing.",
      ss_hp: "",
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(sent.length, sentBefore + 1);
  assert.equal(sent[0].to, "owner@example.com");
  assert.equal(sent[0].from, "SoundStack <onboarding@resend.dev>");
  assert.equal(sent[0].subject, "New free feature request: Tape Stop");
  assert.match(sent[0].text, /https:\/\/example.com\/tape-stop/);
  assert.match(sent[0].text, /maker@example.com/);
  assert.match(sent[0].text, /We will share the listing/);

  const honeypot = await requestFeature(
    jsonRequest("/api/sponsors/feature-request", {
      name: "",
      ss_hp: "https://spam.example",
    }),
  );
  assert.equal(honeypot.status, 200);
  assert.equal(sent.length, 1);

  const missing = await requestFeature(
    jsonRequest("/api/sponsors/feature-request", {
      name: "Tape Stop",
      url: "https://example.com/tape-stop",
      email: "maker@example.com",
      note: "   ",
    }),
  );
  assert.equal(missing.status, 400);
  assert.equal(sent.length, 1);

  delete process.env.RESEND_FROM;
  const fallback = await requestFeature(
    jsonRequest("/api/sponsors/feature-request", {
      name: "Other Plugin",
      url: "https://example.com/other",
      email: "maker@example.com",
      note: "Sharing it.",
    }),
  );
  assert.equal(fallback.status, 200);
  assert.equal(sent[1].from, "onboarding@resend.dev");
  assert.equal(sent[1].subject, "New free feature request: Other Plugin");

  const draft = freeFeatureRequestDraft({
    name: "Tape Stop",
    url: "https://example.com/tape-stop",
    email: "maker@example.com",
    note: "Hello",
    from: "onboarding@resend.dev",
    owner: "owner@example.com",
  });
  assert.equal(draft.subject, "New free feature request: Tape Stop");

  delete process.env.RESEND_API_KEY;
  const unconfigured = await requestFeature(
    jsonRequest("/api/sponsors/feature-request", {
      name: "Quiet",
      url: "https://example.com/quiet",
      email: "maker@example.com",
      note: "Still sharing.",
    }),
  );
  assert.equal(unconfigured.status, 503);
  assert.equal(sent.length, 2);
});

test("feature requests are rate limited per address", async () => {
  const init = {
    headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
  };
  for (let index = 0; index < FEATURE_REQUEST_LIMIT; index += 1) {
    const response = await requestFeature(
      jsonRequest(
        "/api/sponsors/feature-request",
        {
          name: `Plugin ${index}`,
          url: `https://example.com/plugin-${index}`,
          email: "maker@example.com",
          note: "We will share the listing.",
        },
        init,
      ),
    );
    assert.equal(response.status, 200);
  }
  assert.equal(sent.length, FEATURE_REQUEST_LIMIT);

  const blocked = await requestFeature(
    jsonRequest(
      "/api/sponsors/feature-request",
      {
        name: "One more",
        url: "https://example.com/one-more",
        email: "maker@example.com",
        note: "We will share the listing.",
      },
      init,
    ),
  );
  assert.equal(blocked.status, 429);
  assert.equal(sent.length, FEATURE_REQUEST_LIMIT);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
});

test("admin approval stores a complimentary sponsor in the same blob", async () => {
  const anonymous = await approveFree(
    jsonRequest("/api/sponsors/free", {
      name: "Tape Stop",
      url: "https://example.com/tape-stop",
      email: "maker@example.com",
    }),
  );
  assert.equal(anonymous.status, 401);

  const approved = await approveFree(
    adminRequest("/api/sponsors/free", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Tape Stop",
        url: "example.com/tape-stop",
        email: "Maker@Example.com",
      }),
    }),
  );
  assert.equal(approved.status, 200);
  const body = await approved.json();
  assert.equal(body.sponsor.name, "Tape Stop");
  assert.equal(body.sponsor.url, "https://example.com/tape-stop");
  assert.equal(body.sponsor.email, "maker@example.com");
  assert.equal(body.sponsor.amount, 0);
  assert.equal(body.sponsor.days, 7);
  assert.match(body.sponsor.id, /^free_[a-f0-9]+$/);
  assert.equal(body.sponsor.featuredUntil, addUtcDays(body.sponsor.paidAt, 7));

  const stored = await listSponsors();
  const pinned = mergeSponsorsIntoDeals([], stored, stored[0].paidAt);
  assert.equal(pinned[0].sponsored, undefined);
  assert.equal(pinned[0].featured, true);

  const listed = await GET(adminRequest("/api/sponsors/active"));
  const listedBody = await listed.json();
  assert.equal(listedBody.sponsors.length, 1);
  assert.equal(listedBody.sponsors[0].amount, 0);

  const marked = await markIncluded(
    adminRequest("/api/sponsors/active", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [body.sponsor.id] }),
    }),
  );
  assert.equal(marked.status, 200);
  assert.deepEqual((await marked.json()).included, [body.sponsor.id]);

  const custom = await approveFree(
    adminRequest("/api/sponsors/free", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Short Run",
        url: "https://example.com/short",
        email: "maker@example.com",
        days: 3,
      }),
    }),
  );
  const customBody = await custom.json();
  assert.equal(custom.status, 200);
  assert.equal(customBody.sponsor.featuredUntil, addUtcDays(customBody.sponsor.paidAt, 3));

  const badDays = await approveFree(
    adminRequest("/api/sponsors/free", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Nope",
        url: "https://example.com/nope",
        email: "maker@example.com",
        days: 0,
      }),
    }),
  );
  assert.equal(badDays.status, 400);

  delete process.env.ADMIN_TOKEN;
  const unconfigured = await approveFree(
    new Request("http://localhost/api/sponsors/free", {
      method: "POST",
      headers: {
        authorization: "Bearer anything",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Nope",
        url: "https://example.com/nope",
        email: "maker@example.com",
      }),
    }),
  );
  assert.equal(unconfigured.status, 503);
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

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function jsonRequest(
  path: string,
  body: unknown,
  init?: { headers?: Record<string, string> },
) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });
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
