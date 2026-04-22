import { redis } from "./redis";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number; // seconds until window reset
}

/**
 * Fixed-window rate limit using Redis INCR + EXPIRE.
 * Fails open if Redis is unavailable.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    const ttl = await redis.ttl(redisKey);
    return {
      success: count <= limit,
      remaining: Math.max(0, limit - count),
      reset: ttl > 0 ? ttl : windowSeconds,
    };
  } catch {
    // Fail open if Redis is down
    return { success: true, remaining: limit, reset: windowSeconds };
  }
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function rateLimitResponse(result: RateLimitResult) {
  return Response.json(
    { error: "Muitas tentativas. Tente novamente em alguns instantes." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.reset),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}
