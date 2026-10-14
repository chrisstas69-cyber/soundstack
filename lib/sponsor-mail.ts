import type { Sponsor } from "@/lib/sponsors";
import { createHash } from "node:crypto";
import { Resend } from "resend";

export const DEFAULT_RESEND_FROM = "onboarding@resend.dev";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SponsorEmail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

export type SponsorEmailResult = {
  ownerSent: boolean;
  buyerSent: boolean;
  ownerError: string | null;
  buyerError: string | null;
};

type Mailer = (email: SponsorEmail) => Promise<void>;

let testMailer: Mailer | null = null;

/** Replaces Resend for the local signed-webhook test. Pass null to restore. */
export function setSponsorMailerForTests(mailer: Mailer | null): void {
  testMailer = mailer;
}

export function resendFromAddress(): string {
  const configured = process.env.RESEND_FROM?.trim();
  return configured || DEFAULT_RESEND_FROM;
}

export function ownerAlertSubject(sponsorName: string, amountLabel: string): string {
  return `You made ${amountLabel} from ${sponsorName}`;
}

/** Checkout Session `amount_total` in major units. Whole dollars omit cents. */
export function formatCheckoutAmount(
  amount: number | null,
  currency: string | null,
): string | null {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  const code = (currency ?? "usd").toUpperCase();
  if (code === "USD" || code === "EUR" || code === "GBP") {
    const hasCents = amount % 100 !== 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: hasCents ? 2 : 0,
    }).format(amount / 100);
  }
  return `${amount} ${code}`;
}

export function sponsorEmailDrafts(
  sponsor: Sponsor,
  from: string,
  owner: string,
): SponsorEmail[] {
  const drafts: SponsorEmail[] = [
    ownerDraft(sponsor, from, owner),
  ];
  if (sponsor.email) drafts.push(buyerDraft(sponsor, from, sponsor.email));
  return drafts;
}

export function freeFeatureRequestDraft(input: {
  name: string;
  url: string;
  email: string;
  note: string;
  from: string;
  owner: string;
}): SponsorEmail {
  const subject = `New free feature request: ${input.name}`;
  const text = [
    subject,
    "",
    `Name: ${input.name}`,
    `URL: ${input.url}`,
    `Email: ${input.email}`,
    `Note: ${input.note}`,
  ].join("\n");
  const noteHtml = escapeHtml(input.note).replaceAll("\n", "<br>");
  const html = [
    `<p>${escapeHtml(subject)}</p>`,
    "<ul>",
    `<li>Name: ${escapeHtml(input.name)}</li>`,
    `<li>URL: <a href="${escapeHtml(input.url)}">${escapeHtml(input.url)}</a></li>`,
    `<li>Email: ${escapeHtml(input.email)}</li>`,
    `<li>Note: ${noteHtml}</li>`,
    "</ul>",
  ].join("");
  const digest = createHash("sha256")
    .update(`${input.name}\n${input.url}\n${input.email}\n${input.note}`)
    .digest("hex")
    .slice(0, 40);

  return {
    from: input.from,
    to: input.owner,
    subject,
    text,
    html,
    idempotencyKey: `free-feature-request/${digest}`,
  };
}

export async function sendFreeFeatureRequest(request: {
  name: string;
  url: string;
  email: string;
  note: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const owner = process.env.OWNER_ALERT_EMAIL?.trim().toLowerCase() ?? "";
  if (!apiKey || !owner || !EMAIL_PATTERN.test(owner)) {
    throw new Error(
      "Feature requests are not configured. Set RESEND_API_KEY and OWNER_ALERT_EMAIL.",
    );
  }

  await deliver(
    apiKey,
    freeFeatureRequestDraft({
      ...request,
      from: resendFromAddress(),
      owner,
    }),
  );
}

export async function sendSponsorEmails(
  sponsor: Sponsor,
): Promise<SponsorEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const owner = process.env.OWNER_ALERT_EMAIL?.trim().toLowerCase() ?? "";
  if (!apiKey || !owner || !EMAIL_PATTERN.test(owner)) {
    throw new Error(
      "Owner alert is not configured. Set RESEND_API_KEY and OWNER_ALERT_EMAIL.",
    );
  }

  const from = resendFromAddress();
  const drafts = sponsorEmailDrafts(sponsor, from, owner);
  const ownerEmail = drafts[0];
  const buyerEmail = drafts[1] ?? null;

  let ownerSent = sponsor.ownerAlertSent;
  let ownerError: string | null = null;
  if (!sponsor.ownerAlertSent) {
    try {
      await deliver(apiKey, ownerEmail);
      ownerSent = true;
    } catch (error) {
      ownerError = error instanceof Error ? error.message : "Could not email the owner.";
    }
  }

  let buyerSent = sponsor.buyerAlertSent || !sponsor.email;
  let buyerError: string | null = null;
  if (buyerEmail && !sponsor.buyerAlertSent) {
    try {
      await deliver(apiKey, buyerEmail);
      buyerSent = true;
    } catch (error) {
      buyerError = error instanceof Error ? error.message : "Could not email the buyer.";
      buyerSent = false;
    }
  }

  return { ownerSent, buyerSent, ownerError, buyerError };
}

async function deliver(apiKey: string, email: SponsorEmail): Promise<void> {
  if (testMailer) {
    await testMailer(email);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send(
    {
      from: email.from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    },
    { idempotencyKey: email.idempotencyKey },
  );

  if (error) throw new Error(error.message);
}

function ownerDraft(sponsor: Sponsor, from: string, owner: string): SponsorEmail {
  const paid = formatCheckoutAmount(sponsor.amountTotal, sponsor.currency);
  const amount = paid ?? "unknown";
  const buyer = sponsor.email ?? "not collected";
  const headline = paid
    ? `You made ${paid} from ${sponsor.name}.`
    : `New SoundStack sponsor: ${sponsor.name}.`;
  const text = [
    headline,
    "",
    `Name: ${sponsor.name}`,
    `URL: ${sponsor.url}`,
    `Buyer: ${buyer}`,
    `Amount: ${amount}`,
    `Paid: ${sponsor.paidAt}`,
    `Drops off: ${sponsor.featuredUntil} (featuredUntil, UTC)`,
    `Session: ${sponsor.id}`,
  ].join("\n");

  const html = [
    `<p>${escapeHtml(headline)}</p>`,
    "<ul>",
    `<li>Name: ${escapeHtml(sponsor.name)}</li>`,
    `<li>URL: <a href="${escapeHtml(sponsor.url)}">${escapeHtml(sponsor.url)}</a></li>`,
    `<li>Buyer: ${escapeHtml(buyer)}</li>`,
    `<li>Amount: ${escapeHtml(amount)}</li>`,
    `<li>Paid: ${escapeHtml(sponsor.paidAt)}</li>`,
    `<li>Drops off: ${escapeHtml(sponsor.featuredUntil)} (featuredUntil, UTC)</li>`,
    `<li>Session: ${escapeHtml(sponsor.id)}</li>`,
    "</ul>",
  ].join("");

  return {
    from,
    to: owner,
    subject: paid
      ? ownerAlertSubject(sponsor.name, paid)
      : `New SoundStack sponsor: ${sponsor.name}`,
    text,
    html,
    idempotencyKey: idempotencyKey("sponsor-owner-alert", sponsor.id),
  };
}

function buyerDraft(sponsor: Sponsor, from: string, buyer: string): SponsorEmail {
  const paid = formatCheckoutAmount(sponsor.amountTotal, sponsor.currency);
  const lastDay = addUtcDaysIso(sponsor.featuredUntil, -1);
  const received = paid ? `Payment received: ${paid}.` : "Payment received.";
  const text = [
    received,
    `${sponsor.name} is featured on SoundStack for 7 days.`,
    "",
    sponsor.url,
    "",
    `The listing stays in the featured slot through ${lastDay} UTC and drops off on ${sponsor.featuredUntil}.`,
  ].join("\n");

  const html = [
    `<p>${escapeHtml(received)}</p>`,
    `<p>${escapeHtml(sponsor.name)} is featured on SoundStack for 7 days.</p>`,
    `<p><a href="${escapeHtml(sponsor.url)}">${escapeHtml(sponsor.url)}</a></p>`,
    `<p>The listing stays in the featured slot through ${escapeHtml(lastDay)} UTC and drops off on ${escapeHtml(sponsor.featuredUntil)}.</p>`,
  ].join("");

  return {
    from,
    to: buyer,
    subject: paid
      ? `Your ${paid} SoundStack sponsorship is confirmed`
      : "Your SoundStack sponsorship is confirmed",
    text,
    html,
    idempotencyKey: idempotencyKey("sponsor-buyer-confirmation", sponsor.id),
  };
}

function addUtcDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function idempotencyKey(kind: string, id: string): string {
  const key = `${kind}/${id}`;
  return key.length <= 256 ? key : key.slice(0, 256);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
