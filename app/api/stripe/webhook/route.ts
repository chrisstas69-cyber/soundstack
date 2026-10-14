import { sendSponsorEmails } from "@/lib/sponsor-mail";
import {
  isSponsorStoreConfigured,
  markSponsorAlerts,
  saveSponsor,
} from "@/lib/sponsor-store";
import { sponsorFromCheckout } from "@/lib/sponsors";
import { NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * Signature checks only need STRIPE_WEBHOOK_SECRET. The Stripe client still
 * requires a key string to construct; it is not used for this local verify.
 */
const WEBHOOK_CLIENT_KEY = "sk_test_webhook_signature_only";

const MISSING_LISTING =
  'Paid checkout has no product name and https URL. On the Payment Link, add required custom fields product_name and product_url. pluginname/pluginurl, metadata, or client_reference_id "Name|https://..." also work.';

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

  let sponsor;
  try {
    const saved = await saveSponsor(parsed.sponsor);
    sponsor = saved.sponsor;
  } catch (error) {
    console.error("[soundstack] could not persist sponsor", session.id, error);
    return NextResponse.json(
      { error: "Could not persist sponsor." },
      { status: 500 },
    );
  }

  const needsOwner = !sponsor.ownerAlertSent;
  const needsBuyer = Boolean(sponsor.email) && !sponsor.buyerAlertSent;
  if (!needsOwner && !needsBuyer) {
    return NextResponse.json({
      received: true,
      featured: true,
      featuredUntil: sponsor.featuredUntil,
      idempotent: true,
    });
  }

  let alerts;
  try {
    alerts = await sendSponsorEmails(sponsor);
  } catch (error) {
    console.error("[soundstack] sponsor email is not configured", sponsor.id, error);
    return NextResponse.json(
      {
        error:
          "Could not send sponsor email. Set RESEND_API_KEY and OWNER_ALERT_EMAIL.",
        featured: true,
        featuredUntil: sponsor.featuredUntil,
      },
      { status: 500 },
    );
  }

  try {
    await markSponsorAlerts(sponsor.id, {
      ownerAlertSent: alerts.ownerSent,
      buyerAlertSent: alerts.buyerSent && !alerts.buyerError,
    });
  } catch (error) {
    console.error("[soundstack] could not record sponsor alerts", sponsor.id, error);
    return NextResponse.json(
      {
        error: "Could not record sponsor alerts.",
        featured: true,
        featuredUntil: sponsor.featuredUntil,
      },
      { status: 500 },
    );
  }

  if (alerts.ownerError) {
    console.error("[soundstack] owner alert failed", sponsor.id, alerts.ownerError);
    return NextResponse.json(
      {
        error: "Could not send the owner alert.",
        featured: true,
        featuredUntil: sponsor.featuredUntil,
      },
      { status: 500 },
    );
  }

  if (alerts.buyerError) {
    console.error("[soundstack] buyer confirmation failed", sponsor.id, alerts.buyerError);
  }

  console.log("[soundstack] featured sponsor", {
    id: sponsor.id,
    name: sponsor.name,
    url: sponsor.url,
    featuredUntil: sponsor.featuredUntil,
  });

  return NextResponse.json({
    received: true,
    featured: true,
    featuredUntil: sponsor.featuredUntil,
    ownerAlerted: alerts.ownerSent,
    buyerAlerted: Boolean(sponsor.email) && !alerts.buyerError,
  });
}
