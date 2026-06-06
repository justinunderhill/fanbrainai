import { NextResponse } from 'next/server';

type RateLimitConfig = { limit: number; windowMs: number };
type RateLimitResult = { success: boolean; remaining: number; retryAfterSeconds: number };

const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

function sweep(now: number) {
  // Periodic cleanup so the map doesn't grow unbounded on a long-lived instance.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hits] of buckets) {
    const recent = hits.filter((t) => t > now - 3_600_000);
    if (recent.length === 0) buckets.delete(key);
    else buckets.set(key, recent);
  }
}

/**
 * Best-effort in-memory sliding-window rate limiter.
 *
 * NOTE: On serverless (Vercel) each function instance has its own memory, so
 * this enforces a per-instance limit, not a strict global one. It reliably
 * blunts naive request loops (which tend to reuse a warm instance) but is not a
 * hard cross-region guarantee. To make it strict, back it with a shared store
 * (Upstash Redis / Vercel KV) — the call sites won't need to change.
 */
export function rateLimit(identifier: string, { limit, windowMs }: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const windowStart = now - windowMs;
  const hits = (buckets.get(identifier) ?? []).filter((t) => t > windowStart);

  if (hits.length >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    return { success: false, remaining: 0, retryAfterSeconds };
  }

  hits.push(now);
  buckets.set(identifier, hits);
  return { success: true, remaining: limit - hits.length, retryAfterSeconds: 0 };
}

/** Standard 429 response with a Retry-After header. */
export function tooManyRequestsResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again in a moment.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}
