import Stripe from "stripe";

type SponsorRecord = {
  recordedAt: string;
  eventId: string;
  sessionId: string;
  email: string | null;
  amountTotal: number | null;
  currency: string | null;
  paymentStatus: string | null;
};

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return Response.json(
      { error: "Stripe webhook is not configured. Set STRIPE_WEBHOOK_SECRET." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = Stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const sponsor: SponsorRecord = {
      recordedAt: new Date().toISOString(),
      eventId: event.id,
      sessionId: session.id,
      email: session.customer_details?.email ?? session.customer_email ?? null,
      amountTotal: session.amount_total,
      currency: session.currency,
      paymentStatus: session.payment_status,
    };

    // TODO: Persist `sponsor` (Vercel Postgres, KV, or similar), then set
    // `featured` and `featuredUntil` on the matching deal. Logging is the MVP
    // stand-in. It is not durable, and this route does not write the deal file.
    console.info(
      JSON.stringify({
        source: "soundstack",
        event: "sponsor.checkout.session.completed",
        sponsor,
      }),
    );
  }

  return Response.json({ received: true });
}
