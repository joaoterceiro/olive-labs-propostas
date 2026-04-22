import { z } from "zod";
import crypto from "node:crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/prisma-tenant";
import { passwordSchema } from "@/lib/password";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(32),
  password: passwordSchema,
});

export async function POST(request: Request) {
  const limit = await rateLimit(`reset-confirm:${clientIp(request)}`, 10, 600);
  if (!limit.success) return rateLimitResponse(limit);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON invalido", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message || "Dados invalidos";
    return errorResponse(first, 400);
  }

  const { token, password } = parsed.data;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.isActive) {
    return errorResponse("Token invalido ou expirado", 400);
  }

  const passwordHash = await hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate any other outstanding tokens for this user
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null, NOT: { id: record.id } },
    }),
  ]);

  return Response.json({ ok: true });
}
