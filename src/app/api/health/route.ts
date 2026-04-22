import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { minioClient, ensureBuckets } from "@/lib/minio";

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

export async function GET() {
  const [db, redisStatus, minio] = await Promise.all([
    checkPrisma(),
    checkRedis(),
    checkMinio(),
  ]);
  const allOk = db.ok && redisStatus.ok && minio.ok;
  return Response.json(
    {
      ok: allOk,
      services: { db, redis: redisStatus, minio },
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  );
}
