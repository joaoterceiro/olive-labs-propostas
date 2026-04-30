import * as Minio from "minio";

const globalForMinio = globalThis as unknown as { minio: Minio.Client };

/**
 * Refuse to ship dev fallback credentials to a production *runtime*.
 *
 * Important: skip the guard during `next build` (NEXT_PHASE === 'phase-production-build').
 * Next collects route metadata at build time by importing every module — that import
 * runs with NODE_ENV=production but without runtime env vars (MinIO env vars are
 * injected at container start, not at image build). Throwing here would break CI.
 */
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build"
) {
  const required = ["MINIO_ENDPOINT", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[minio] Missing required env vars in production: ${missing.join(", ")}.`
    );
  }
}

export const minioClient =
  globalForMinio.minio ||
  new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "9000"),
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "ello_minio",
    secretKey: process.env.MINIO_SECRET_KEY || "ello_minio_secret",
  });

if (process.env.NODE_ENV !== "production") globalForMinio.minio = minioClient;

const BUCKETS = [
  process.env.MINIO_BUCKET_PDFS || "propostas-pdf",
  process.env.MINIO_BUCKET_ATTACHMENTS || "attachments",
  process.env.MINIO_BUCKET_LOGOS || "logos",
];

export async function ensureBuckets(): Promise<void> {
  for (const bucket of BUCKETS) {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket);
    }
  }
}

export async function uploadFile(
  bucket: string,
  objectName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await minioClient.putObject(bucket, objectName, buffer, buffer.length, {
    "Content-Type": contentType,
  });
  return objectName;
}

export async function getFileUrl(
  bucket: string,
  objectName: string,
  expirySeconds: number = 3600
): Promise<string> {
  return minioClient.presignedGetObject(bucket, objectName, expirySeconds);
}

export async function deleteFile(
  bucket: string,
  objectName: string
): Promise<void> {
  await minioClient.removeObject(bucket, objectName);
}
