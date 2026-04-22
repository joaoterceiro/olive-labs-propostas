import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/prisma-tenant";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { sendMail, appBaseUrl, renderBrandedEmail } from "@/lib/mailer";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  // Rate limit: 5 requests / 10 min per IP
  const limit = await rateLimit(`reset:${clientIp(request)}`, 5, 600);
  if (!limit.success) return rateLimitResponse(limit);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON invalido", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorResponse("Email invalido", 400);

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  // Always return 200 to prevent email enumeration
  if (!user || !user.isActive) {
    return Response.json({ ok: true });
  }

  // Invalidate old tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  // Generate token: raw sent by email, hashed stored
  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const url = `${appBaseUrl()}/redefinir-senha?token=${raw}`;
  const html = renderBrandedEmail(
    "Redefinir sua senha",
    `
      <p>Olá, ${user.name}!</p>
      <p>Recebemos um pedido para redefinir a senha da sua conta na Olive Labs. Clique no botão abaixo para criar uma nova senha (link válido por 1 hora):</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${url}" style="background:#94C020;color:#0a0f0a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Redefinir senha</a>
      </p>
      <p style="font-size:12px;color:#6b6f76;">Se você não solicitou essa redefinição, pode ignorar este e-mail com segurança.</p>
    `
  );

  await sendMail({
    to: user.email,
    subject: "Redefinir sua senha — Olive Labs",
    html,
    text: `Para redefinir sua senha, acesse: ${url}`,
  });

  return Response.json({ ok: true });
}
