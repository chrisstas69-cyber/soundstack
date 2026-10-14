import { isSponsorStoreConfigured, saveSponsor } from "@/lib/sponsor-store";
import { sponsorFromCheckout } from "@/lib/sponsors";
import { NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * Signature checks only need STRIPE_WEBHOOK_SECRET. The Stripe client still
 * requires a key string to construct; it is not used for this local verify.
 */
const WEBHOOK_CLIENT_KEY = "sk_test_webhook_signature_only";

const MISSING_LISTING =
  'Paid checkout has no plugin name and https URL. On the Payment Link, add required custom fields pluginname and pluginurl (labels "Plugin or pack name" and "Plugin or pack URL"). Metadata pluginname/pluginurl or client_reference_id "Name|https://..." also works.';

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured. Set STRIPE_WEBHOOK_SECRET." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  const payload = await request.text();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY?.trim() || WEBHOOK_CLIENT_KEY);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  const parsed = sponsorFromCheckout(session);

  if (!parsed.ok) {
    if (parsed.reason === "missing-listing") {
      console.error("[soundstack] paid checkout missing listing", session.id);
      return NextResponse.json({
        received: true,
        featured: false,
        error: MISSING_LISTING,
      });
    }

    return NextResponse.json({
      received: true,
      featured: false,
      reason: "payment_not_paid",
    });
  }

  if (!isSponsorStoreConfigured()) {
    return NextResponse.json(
      {
        error:
          "Sponsor store is not configured. Connect a private Vercel Blob store (BLOB_STORE_ID) or set BLOB_READ_WRITE_TOKEN.",
      },
      { status: 500 },
    );
  }

  try {
    await saveSponsor(parsed.sponsor);
  } catch (error) {
    console.error("[soundstack] could not persist sponsor", session.id, error);
    return NextResponse.json(
      { error: "Could not persist sponsor." },
      { status: 500 },
    );
  }

  console.log("[soundstack] featured sponsor", {
    id: parsed.sponsor.id,
    name: parsed.sponsor.name,
    url: parsed.sponsor.url,
    featuredUntil: parsed.sponsor.featuredUntil,
  });

  return NextResponse.json({
    received: true,
    featured: true,
    featuredUntil: parsed.sponsor.featuredUntil,
  });
}
