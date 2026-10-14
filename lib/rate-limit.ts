type Bucket = number[];

const memoryGlobal = globalThis as typeof globalThis & {
  __soundstackRateLimit?: Map<string, Bucket>;
};

function buckets(): Map<string, Bucket> {
  memoryGlobal.__soundstackRateLimit ??= new Map();
  return memoryGlobal.__soundstackRateLimit;
}

/** Clears in-process counters. Used by the feature-request tests. */
export function resetRateLimitForTests(): void {
  memoryGlobal.__soundstackRateLimit = new Map();
}

export const FEATURE_REQUEST_LIMIT = 5;
export const FEATURE_REQUEST_WINDOW_MS = 60 * 60 * 1000;

export function takeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const map = buckets();
  const recent = (map.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  if (recent.length >= limit) {
    const oldest = recent[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowMs - (now - oldest)) / 1000),
    );
    map.set(key, recent);
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(now);
  map.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}

/** First address in x-forwarded-for, then x-real-ip. */
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim() ?? "";
    if (first) return first.slice(0, 80);
  }
  const real = request.headers.get("x-real-ip")?.trim() ?? "";
  if (real) return real.slice(0, 80);
  return "unknown";
}
