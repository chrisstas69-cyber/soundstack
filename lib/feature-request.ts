import { cleanEmail, cleanHttpsUrl, cleanName } from "@/lib/sponsors";

export const FEATURE_NOTE_MAX = 500;

export type FeatureRequest = {
  name: string;
  url: string;
  email: string;
  note: string;
};

/** True when the hidden field a person never sees has a value. */
export function isHoneypotTripped(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const value = (body as { ss_hp?: unknown }).ss_hp;
  if (typeof value === "string") return value.trim().length > 0;
  return value != null;
}

export function parseFeatureRequest(
  body: unknown,
): { ok: true; request: FeatureRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid JSON body." };
  }

  const row = body as Record<string, unknown>;
  const name = cleanName(typeof row.name === "string" ? row.name : "");
  if (!name) {
    return { ok: false, error: "Enter a product name up to 120 characters." };
  }

  const url = cleanHttpsUrl(typeof row.url === "string" ? row.url : "");
  if (!url) {
    return { ok: false, error: "Enter a public https product URL." };
  }

  const email = cleanEmail(typeof row.email === "string" ? row.email : "");
  if (!email) {
    return { ok: false, error: "Enter a valid contact email." };
  }

  const note = cleanNote(typeof row.note === "string" ? row.note : "");
  if (!note) {
    return {
      ok: false,
      error: `Enter a short note, up to ${FEATURE_NOTE_MAX} characters.`,
    };
  }

  return { ok: true, request: { name, url, email, note } };
}

function cleanNote(value: string): string | null {
  const cleaned = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  if (cleaned.length < 1 || cleaned.length > FEATURE_NOTE_MAX) return null;
  return cleaned;
}
