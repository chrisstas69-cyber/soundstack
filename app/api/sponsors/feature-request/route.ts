import { isHoneypotTripped, parseFeatureRequest } from "@/lib/feature-request";
import {
  FEATURE_REQUEST_LIMIT,
  FEATURE_REQUEST_WINDOW_MS,
  clientAddress,
  takeRateLimit,
} from "@/lib/rate-limit";
import { sendFreeFeatureRequest } from "@/lib/sponsor-mail";
import { NextResponse } from "next/server";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const limit = takeRateLimit(
    `feature-request:${clientAddress(request)}`,
    FEATURE_REQUEST_LIMIT,
    FEATURE_REQUEST_WINDOW_MS,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: {
          ...NO_STORE,
          "Retry-After": String(limit.retryAfterSeconds),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: NO_STORE },
    );
  }

  if (isHoneypotTripped(body)) {
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  const parsed = parseFeatureRequest(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    await sendFreeFeatureRequest(parsed.request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("not configured")) {
      return NextResponse.json(
        {
          error:
            "Feature requests are not configured. Set RESEND_API_KEY and OWNER_ALERT_EMAIL.",
        },
        { status: 503, headers: NO_STORE },
      );
    }
    console.error("[soundstack] could not email a free feature request", error);
    return NextResponse.json(
      { error: "Could not send that request. Try again in a moment." },
      { status: 502, headers: NO_STORE },
    );
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
