/**
 * Origin/Referer check for state-changing API requests.
 *
 * NextAuth's SameSite=strict session cookie already blocks the most common
 * CSRF vectors. This is a defense-in-depth layer at the edge: even if the
 * SameSite contract loosens for any reason (browser regression, malicious
 * extension, third-party cookie policy change), a forged cross-origin POST
 * still fails because its `Origin` header won't match `NEXTAUTH_URL`.
 *
 * Returns `true` when the request looks same-origin (or `NEXTAUTH_URL` is
 * unset, which we treat as dev / not configured). Cron jobs and webhooks
 * are excluded by the caller — they don't carry an Origin header.
 */
export function originAllowed(req: Request): boolean {
  const expected = (process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
  if (!expected) return true; // dev / unset → permissive

  const origin = req.headers.get("origin");
  if (origin) {
    return origin.replace(/\/+$/, "") === expected;
  }

  // Some browsers / fetches omit Origin; fall back to Referer.
  const referer = req.headers.get("referer") || "";
  if (referer) return referer.startsWith(expected + "/") || referer === expected;

  // No Origin and no Referer on a state-changing request: refuse.
  return false;
}
