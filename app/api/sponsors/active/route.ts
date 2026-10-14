import { adminTokenConfigured, isAdminAuthorized } from "@/lib/admin-auth";
import { listSponsorsStrict, markSponsorsIncluded } from "@/lib/sponsor-store";
import { isSponsorId, sponsorsPendingNewsletter, type Sponsor } from "@/lib/sponsors";
import { NextResponse } from "next/server";

const MAX_IDS = 50;

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function unauthorized(): NextResponse {
  if (!adminTokenConfigured()) {
    return NextResponse.json(
      { error: "Sponsor admin API is not configured. Set ADMIN_TOKEN." },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return unauthorized();

  try {
    const sponsors = sponsorsPendingNewsletter(
      await listSponsorsStrict(),
      utcToday(),
    );
    return NextResponse.json(
      { sponsors: sponsors.map(publicSponsor) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[soundstack] could not list active sponsors", error);
    return NextResponse.json(
      { error: "Could not read sponsors." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ids = readIds(body);
  if (!ids) {
    return NextResponse.json(
      { error: "Provide ids, an array of sponsor ids." },
      { status: 400 },
    );
  }

  try {
    const included = await markSponsorsIncluded(ids);
    const missing = ids.filter((id) => !included.includes(id));
    return NextResponse.json(
      { ok: true, included, missing },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[soundstack] could not mark sponsors included", error);
    return NextResponse.json(
      { error: "Could not update sponsors." },
      { status: 500 },
    );
  }
}

function publicSponsor(sponsor: Sponsor) {
  return {
    id: sponsor.id,
    name: sponsor.name,
    url: sponsor.url,
    email: sponsor.email,
    amount: sponsor.amountTotal,
    currency: sponsor.currency,
    paidAt: sponsor.paidAt,
    featuredUntil: sponsor.featuredUntil,
    includedInNewsletter: sponsor.includedInNewsletter,
  };
}

function readIds(body: unknown): string[] | null {
  if (!body || typeof body !== "object") return null;
  const ids = (body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS) return null;
  if (!ids.every((id) => typeof id === "string" && isSponsorId(id))) return null;
  return ids;
}
