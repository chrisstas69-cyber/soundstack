import type { Sponsor } from "@/lib/sponsors";
import { Resend } from "resend";

export const DEFAULT_RESEND_FROM = "onboarding@resend.dev";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPONSOR_PRICE_LABEL = "$149";

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

export function ownerAlertSubject(sponsorName: string): string {
  return `You made ${SPONSOR_PRICE_LABEL} from ${sponsorName}`;
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
  const amount = formatCharge(sponsor.amountTotal, sponsor.currency);
  const buyer = sponsor.email ?? "not collected";
  const text = [
    `You made ${SPONSOR_PRICE_LABEL} from ${sponsor.name}.`,
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
    `<p>You made ${SPONSOR_PRICE_LABEL} from ${escapeHtml(sponsor.name)}.</p>`,
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
    subject: ownerAlertSubject(sponsor.name),
    text,
    html,
    idempotencyKey: idempotencyKey("sponsor-owner-alert", sponsor.id),
  };
}

function buyerDraft(sponsor: Sponsor, from: string, buyer: string): SponsorEmail {
  const lastDay = addUtcDaysIso(sponsor.featuredUntil, -1);
  const text = [
    `${sponsor.name} is featured on SoundStack for 7 days.`,
    "",
    sponsor.url,
    "",
    `The listing stays in the featured slot through ${lastDay} UTC and drops off on ${sponsor.featuredUntil}.`,
  ].join("\n");

  const html = [
    `<p>${escapeHtml(sponsor.name)} is featured on SoundStack for 7 days.</p>`,
    `<p><a href="${escapeHtml(sponsor.url)}">${escapeHtml(sponsor.url)}</a></p>`,
    `<p>The listing stays in the featured slot through ${escapeHtml(lastDay)} UTC and drops off on ${escapeHtml(sponsor.featuredUntil)}.</p>`,
  ].join("");

  return {
    from,
    to: buyer,
    subject: "Your SoundStack sponsorship is confirmed",
    text,
    html,
    idempotencyKey: idempotencyKey("sponsor-buyer-confirmation", sponsor.id),
  };
}

function formatCharge(amount: number | null, currency: string | null): string {
  if (amount == null) return "unknown";
  const code = (currency ?? "usd").toUpperCase();
  if (code === "USD" || code === "EUR" || code === "GBP") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(amount / 100);
  }
  return `${amount} ${code}`;
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
