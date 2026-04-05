import { requireSession, errorResponse } from "@/lib/prisma-tenant";
import { uploadFile, ensureBuckets } from "@/lib/minio";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_BUCKETS = ["logos", "attachments"] as const;
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];

function isAllowedBucket(value: string): value is AllowedBucket {
  return (ALLOWED_BUCKETS as readonly string[]).includes(value);
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
    await ensureBuckets();

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadFile(bucket, key, buffer, file.type || "application/octet-stream");

    return Response.json({
      key,
      bucket,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
    });
  } catch (err) {
    console.error("[upload] Error uploading file:", err);
    return errorResponse("Erro ao fazer upload do arquivo.", 500);
  }
}
