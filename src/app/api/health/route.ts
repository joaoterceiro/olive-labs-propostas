import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { minioClient, ensureBuckets } from "@/lib/minio";
import { backupHealth } from "@/lib/backup-status";

export const dynamic = "force-dynamic";

async function checkPrisma() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function checkRedis() {
  try {
    if (redis.status !== "ready" && redis.status !== "connecting") {
      await redis.connect().catch(() => {});
    }
    await redis.ping();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function checkMinio() {
  try {
    await minioClient.listBuckets();
    await ensureBuckets();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function checkBackup() {
  try {
    const status = await backupHealth();
    // "unknown" = not configured (dev) → don't fail the health check
    // "stale"   = configured but >26 h without heartbeat → soft-warn
    // "error"   = bucket unreachable → soft-warn (don't 503 the app for it)
    return { ok: status === "fresh" || status === "unknown", status };
  } catch (e) {
    return { ok: false, status: "error", error: (e as Error).message };
  }
}

export async function GET() {
  const [db, redisStatus, minio, backup] = await Promise.all([
    checkPrisma(),
    checkRedis(),
    checkMinio(),
    checkBackup(),
  ]);
  // The hard liveness signal stays db/redis/minio. Backup freshness is
  // surfaced for monitoring but does NOT 503 the app — a stale backup is
  // operational concern, not user-facing degradation.
  const allOk = db.ok && redisStatus.ok && minio.ok;
  return Response.json(
    {
      ok: allOk,
      services: { db, redis: redisStatus, minio, backup },
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  );
}
