import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/prisma-tenant";
import { hashSync } from "bcryptjs";
import { z } from "zod";
import { passwordSchema } from "@/lib/password";
import { sendMail, renderBrandedEmail, appBaseUrl } from "@/lib/mailer";

const createSchema = z.object({
  name: z.string().min(1, "Nome obrigatorio"),
  email: z.string().email("E-mail invalido"),
  password: passwordSchema,
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
  sendInvite: z.boolean().default(true),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return notFoundResponse();
  }

  const members = await prisma.membership.findMany({
    where: { organizationId: id },
    include: {
      user: {
        select: { id: true, name: true, email: true, isActive: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ data: members });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return notFoundResponse();
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message || "Dados invalidos");
  }
  const { name, email, password, role, sendInvite } = parsed.data;

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const passwordHash = hashSync(password, 10);
    user = await prisma.user.create({
      data: { name, email, passwordHash },
    });
  }

  const existingMembership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: id,
      },
    },
  });

  if (existingMembership) {
    return errorResponse("Usuário já é membro desta organização.", 409);
  }

  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      organizationId: id,
      role,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, isActive: true },
      },
    },
  });

  if (sendInvite) {
    const loginUrl = `${appBaseUrl()}/login`;
    const html = renderBrandedEmail(
      `Bem-vindo a ${org.name}`,
      `
        <p>Olá, ${name}!</p>
        <p>Você foi convidado para acessar a plataforma Olive Labs na organização <strong>${org.name}</strong>.</p>
        <p>Suas credenciais:</p>
        <ul style="line-height:1.8;">
          <li><strong>E-mail:</strong> ${email}</li>
          <li><strong>Senha temporária:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${password}</code></li>
        </ul>
        <p style="text-align:center;margin:28px 0;">
          <a href="${loginUrl}" style="background:#94C020;color:#0a0f0a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Acessar plataforma</a>
        </p>
        <p style="font-size:12px;color:#6b6f76;">Por segurança, troque sua senha logo no primeiro acesso em &quot;Meu Perfil&quot;.</p>
      `
    );
    await sendMail({
      to: email,
      subject: `Seu acesso a ${org.name} — Olive Labs`,
      html,
    });
  }

  return Response.json({ data: membership }, { status: 201 });
}
