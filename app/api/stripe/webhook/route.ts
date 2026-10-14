import { NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * Signature checks only need STRIPE_WEBHOOK_SECRET. The Stripe client still
 * requires a key string to construct; it is not used for this local verify.
 */
const WEBHOOK_CLIENT_KEY = "sk_test_webhook_signature_only";

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const sponsor = {
      id: session.id,
      email: session.customer_details?.email ?? session.customer_email ?? null,
      amountTotal: session.amount_total,
      currency: session.currency,
      paymentStatus: session.payment_status,
    };

    // TODO: persist the sponsor (id, email, amount) so a featured placement
    // can be fulfilled. This MVP only logs the verified checkout.
    console.log("[soundstack] sponsor checkout.session.completed", sponsor);
  }

  return NextResponse.json({ received: true });
}
