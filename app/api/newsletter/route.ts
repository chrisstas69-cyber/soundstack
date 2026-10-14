import { NextResponse } from "next/server";
import { Resend } from "resend";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const audienceId = process.env.RESEND_AUDIENCE_ID?.trim();

  if (!apiKey || !audienceId) {
    return NextResponse.json(
      {
        error:
          "Newsletter signup is not configured. Set RESEND_API_KEY and RESEND_AUDIENCE_ID.",
      },
      { status: 503 },
    );
  }

  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email) || email.length > 320) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const resend = new Resend(apiKey);
  const created = await resend.contacts.create({
    email,
    audienceId,
    unsubscribed: false,
  });

  if (!created.error) {
    return NextResponse.json({ ok: true });
  }

  if (isDuplicate(created.error)) {
    return NextResponse.json({ ok: true, alreadySubscribed: true });
  }

  // Resend renamed Audiences to Segments. The same id still works on the
  // legacy audience endpoint; if that rejects the id, try the current API.
  if (shouldRetryAsSegment(created.error.message)) {
    const segmented = await resend.contacts.create({
      email,
      unsubscribed: false,
      segments: [{ id: audienceId }],
    });

    if (!segmented.error) {
      return NextResponse.json({ ok: true });
    }
    if (isDuplicate(segmented.error)) {
      return NextResponse.json({ ok: true, alreadySubscribed: true });
    }

    return NextResponse.json(
      { error: segmented.error.message || "Could not add that email." },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { error: created.error.message || "Could not add that email." },
    { status: 502 },
  );
}

function isDuplicate(error: { message: string; statusCode: number | null }) {
  return (
    error.statusCode === 409 ||
    /already exists|already been added/i.test(error.message)
  );
}

function shouldRetryAsSegment(message: string) {
  return /audience|segment|not found|deprecated|invalid/i.test(message);
}
