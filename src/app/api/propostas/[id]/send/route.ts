import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireSession,
  requireOrgId,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/prisma-tenant";
import { sendMail, renderBrandedEmail, appBaseUrl } from "@/lib/mailer";
import { rateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  to: z.string().email("E-mail invalido"),
  subject: z.string().max(240).optional(),
  message: z.string().max(4000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  let orgId: string;
  try {
    session = await requireSession();
    orgId = await requireOrgId();
  } catch {
    return unauthorizedResponse();
  }

  const limit = await rateLimit(`send:${session.id}:${clientIp(request)}`, 20, 3600);
  if (!limit.success) return rateLimitResponse(limit);

  const { id } = await params;

  const proposal = await prisma.proposal.findFirst({
    where: { id, organizationId: orgId },
    include: { organization: { select: { name: true } } },
  });
  if (!proposal) return notFoundResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON invalido", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || "Dados invalidos");
  }

  const { to, subject, message } = parsed.data;
  const viewUrl = `${appBaseUrl()}/propostas/${id}`;
  const defaultSubject = `Proposta ${proposal.number} — ${proposal.organization.name}`;
  const html = renderBrandedEmail(
    `Proposta ${proposal.number}`,
    `
      <p>Olá,</p>
      ${message ? `<p>${message.replace(/\n/g, "<br/>")}</p>` : ""}
      <p>Preparamos a proposta <strong>${proposal.projectName}</strong> para <strong>${proposal.clientName}</strong>.</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${viewUrl}" style="background:#94C020;color:#0a0f0a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Visualizar proposta</a>
      </p>
      <p style="font-size:12px;color:#6b6f76;">Enviado por ${proposal.organization.name} via Olive Labs.</p>
    `
  );

  const sent = await sendMail({
    to,
    subject: subject || defaultSubject,
    html,
  });

  if (!sent) {
    return errorResponse(
      "Servidor de email nao configurado. Configure SMTP_HOST/SMTP_USER/SMTP_PASS.",
      503
    );
  }

  await prisma.proposal.update({
    where: { id },
    data: {
      status: proposal.status === "DRAFT" ? "SENT" : proposal.status,
      sentAt: new Date(),
    },
  });

  return Response.json({ ok: true });
}
