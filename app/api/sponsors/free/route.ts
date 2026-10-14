import { adminTokenConfigured, isAdminAuthorized } from "@/lib/admin-auth";
import { isSponsorStoreConfigured, saveSponsor } from "@/lib/sponsor-store";
import {
  FREE_FEATURE_MAX_DAYS,
  SPONSOR_FEATURED_DAYS,
  isFeatureDayCount,
  sponsorFromFreeApproval,
} from "@/lib/sponsors";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

const NO_STORE = { "Cache-Control": "no-store" };

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function unauthorized(): NextResponse {
  if (!adminTokenConfigured()) {
    return NextResponse.json(
      { error: "Sponsor admin API is not configured. Set ADMIN_TOKEN." },
      { status: 503, headers: NO_STORE },
    );
  }
  return NextResponse.json(
    { error: "Unauthorized." },
    { status: 401, headers: NO_STORE },
  );
}

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: NO_STORE },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: NO_STORE },
    );
  }

  const row = body as { name?: unknown; url?: unknown; email?: unknown; days?: unknown };
  const days = readDays(row.days);
  if (days === null) {
    return NextResponse.json(
      {
        error: `days must be a whole number from 1 to ${FREE_FEATURE_MAX_DAYS}.`,
      },
      { status: 400, headers: NO_STORE },
    );
  }

  const parsed = sponsorFromFreeApproval({
    id: `free_${randomBytes(12).toString("hex")}`,
    name: typeof row.name === "string" ? row.name : "",
    url: typeof row.url === "string" ? row.url : "",
    email: typeof row.email === "string" ? row.email : "",
    days,
    today: utcToday(),
  });
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: NO_STORE },
    );
  }

  if (!isSponsorStoreConfigured()) {
    return NextResponse.json(
      { error: "Could not store that feature. The sponsor store is not configured." },
      { status: 500, headers: NO_STORE },
    );
  }

  try {
    const { sponsor } = await saveSponsor(parsed.sponsor);
    return NextResponse.json(
      {
        ok: true,
        sponsor: {
          id: sponsor.id,
          name: sponsor.name,
          url: sponsor.url,
          email: sponsor.email,
          amount: sponsor.amountTotal,
          currency: sponsor.currency,
          paidAt: sponsor.paidAt,
          featuredUntil: sponsor.featuredUntil,
          days,
        },
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("[soundstack] could not store a free feature", error);
    return NextResponse.json(
      { error: "Could not store that feature." },
      { status: 500, headers: NO_STORE },
    );
  }
}

function readDays(value: unknown): number | null {
  if (value === undefined) return SPONSOR_FEATURED_DAYS;
  if (typeof value !== "number" || !isFeatureDayCount(value)) return null;
  return value;
}
