import { requireSession, errorResponse } from "@/lib/prisma-tenant";
import { uploadFile, ensureBuckets } from "@/lib/minio";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_BUCKETS = ["logos", "attachments"] as const;
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];

function isAllowedBucket(value: string): value is AllowedBucket {
  return (ALLOWED_BUCKETS as readonly string[]).includes(value);
}

// Magic-byte signatures for accepted image formats
const IMAGE_SIGNATURES: Array<{ mime: string; check: (b: Buffer) => boolean }> = [
  {
    mime: "image/png",
    check: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    mime: "image/jpeg",
    check: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/webp",
    check: (b) =>
      b.length >= 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  {
    mime: "image/gif",
    check: (b) => b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46,
  },
  {
    mime: "image/svg+xml",
    check: (b) => {
      const head = b.slice(0, Math.min(b.length, 256)).toString("utf8").trimStart();
      return head.startsWith("<?xml") || head.startsWith("<svg");
    },
  },
];

function sniffImageMime(buffer: Buffer): string | null {
  for (const sig of IMAGE_SIGNATURES) {
    if (sig.check(buffer)) return sig.mime;
  }
  return null;
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.organizationId;
  if (!orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Formato de dados invalido. Envie multipart/form-data.", 400);
  }

  const file = formData.get("file");
  const bucket = formData.get("bucket");
  const prefix = formData.get("prefix");

  // --- Validate file ---
  if (!file || !(file instanceof File)) {
    return errorResponse("Campo 'file' obrigatorio.", 400);
  }

  if (file.size === 0) {
    return errorResponse("Arquivo vazio.", 400);
  }

  if (file.size > MAX_SIZE) {
    return errorResponse(`Arquivo excede o tamanho maximo de 10MB.`, 413);
  }

  // --- Validate bucket ---
  if (!bucket || typeof bucket !== "string") {
    return errorResponse("Campo 'bucket' obrigatorio (logos | attachments).", 400);
  }

  if (!isAllowedBucket(bucket)) {
    return errorResponse(
      `Bucket invalido: '${bucket}'. Use: ${ALLOWED_BUCKETS.join(", ")}`,
      400
    );
  }

  // --- Validate prefix ---
  const prefixStr =
    prefix && typeof prefix === "string" ? prefix.replace(/[^a-zA-Z0-9_-]/g, "") : "";

  // --- Build object key ---
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = prefixStr
    ? `${orgId}/${prefixStr}/${sanitizedName}`
    : `${orgId}/${sanitizedName}`;

  // --- Upload ---
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // MIME sniffing: verify file content matches an accepted image type
    const detectedMime = sniffImageMime(buffer);
    if (!detectedMime) {
      return errorResponse(
        "Formato de arquivo nao suportado. Envie PNG, JPG, WEBP, GIF ou SVG.",
        415
      );
    }

    await ensureBuckets();
    await uploadFile(bucket, key, buffer, detectedMime);

    return Response.json({
      key,
      bucket,
      fileName: file.name,
      fileSize: file.size,
      mimeType: detectedMime,
    });
  } catch (err) {
    console.error("[upload] Error uploading file:", err);
    return errorResponse("Erro ao fazer upload do arquivo.", 500);
  }
}
