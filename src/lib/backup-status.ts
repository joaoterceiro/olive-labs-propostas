import * as Minio from "minio";

/**
 * Backup health probe — surfaces whether a recent off-site backup heartbeat
 * exists in the configured off-site bucket. Consumed by `/api/health` so an
 * external uptime monitor can page when backups silently stop.
 *
 * Returns:
 *   "fresh"   — heartbeat object dated today or yesterday found
 *   "stale"   — bucket is reachable but no heartbeat in last 26 h
 *   "unknown" — OFFSITE_S3_* not configured (dev / not yet wired)
 *   "error"   — bucket unreachable or wrong credentials (operator action needed)
 */
export type BackupStatus = "fresh" | "stale" | "unknown" | "error";

let cachedClient: Minio.Client | null = null;
let cachedAt = 0;
let cachedStatus: BackupStatus | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — health endpoint can hit this hot

function getOffsiteClient(): Minio.Client | null {
  const endpoint = process.env.OFFSITE_S3_ENDPOINT;
  const key = process.env.OFFSITE_S3_KEY;
  const secret = process.env.OFFSITE_S3_SECRET;
  if (!endpoint || !key || !secret) return null;

  if (cachedClient) return cachedClient;

  // Parse endpoint URL into host + port + ssl flag
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  cachedClient = new Minio.Client({
    endPoint: url.hostname,
    port: url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80,
    useSSL: url.protocol === "https:",
    accessKey: key,
    secretKey: secret,
  });
  return cachedClient;
}

function isoDateUtc(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

/**
 * Fast path: returns cached result if probed in the last 5 minutes.
 * Skips the cache when the previous result was "error" so a fixed
 * misconfiguration is reflected promptly.
 */
export async function backupHealth(): Promise<BackupStatus> {
  const bucket = process.env.OFFSITE_BUCKET;
  const client = getOffsiteClient();
  if (!client || !bucket) return "unknown";

  if (
    cachedStatus &&
    cachedStatus !== "error" &&
    Date.now() - cachedAt < CACHE_TTL_MS
  ) {
    return cachedStatus;
  }

  try {
    // Look for today's or yesterday's heartbeat (UTC). The backup script
    // writes one per day at /heartbeats/YYYY-MM-DD.ok.
    const candidates = [
      `heartbeats/${isoDateUtc(0)}.ok`,
      `heartbeats/${isoDateUtc(-1)}.ok`,
    ];

    let found = false;
    for (const key of candidates) {
      try {
        await client.statObject(bucket, key);
        found = true;
        break;
      } catch {
        // continue to next candidate
      }
    }

    cachedStatus = found ? "fresh" : "stale";
    cachedAt = Date.now();
    return cachedStatus;
  } catch {
    cachedStatus = "error";
    cachedAt = Date.now();
    return "error";
  }
}
