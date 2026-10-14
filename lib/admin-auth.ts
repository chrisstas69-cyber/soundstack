import { createHash, timingSafeEqual } from "node:crypto";

const BEARER = /^Bearer\s+(\S+)\s*$/i;

/** True when the Authorization header matches ADMIN_TOKEN. */
export function isAdminAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_TOKEN?.trim() ?? "";
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const match = BEARER.exec(header);
  if (!match) return false;

  const provided = createHash("sha256").update(match[1]).digest();
  const actual = createHash("sha256").update(expected).digest();
  return timingSafeEqual(provided, actual);
}

export function adminTokenConfigured(): boolean {
  return Boolean(process.env.ADMIN_TOKEN?.trim());
}
