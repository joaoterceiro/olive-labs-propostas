import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/prisma-tenant";
import { hashSync } from "bcryptjs";
import { passwordSchema } from "@/lib/password";
import { sendMail, renderBrandedEmail, appBaseUrl } from "@/lib/mailer";
import { z } from "zod";

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch {
    return unauthorizedResponse();
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
      isActive: true,
      createdAt: true,
      memberships: {
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ data: users });
}

const createSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: passwordSchema,
  organizationId: z.string().min(1, "Selecione uma organização"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
  sendInvite: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || "Dados invalidos");
    }

    const { name, email, password, organizationId, role, sendInvite } = parsed.data;

    // Check if org exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) return errorResponse("Organização não encontrada", 404);

    // Check if email already exists
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create new user
      const passwordHash = hashSync(password, 12);
      user = await prisma.user.create({
        data: { name, email, passwordHash },
      });
    }

    // Check if already member of this org
    const existing = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId } },
    });
    if (existing) {
      return errorResponse("Usuário já é membro desta organização", 409);
    }

    // Create membership
    const membership = await prisma.membership.create({
      data: { userId: user.id, organizationId, role },
      include: {
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
      },
    });

    // Send welcome / invite email with credentials
    if (sendInvite) {
      const loginUrl = `${appBaseUrl()}/login`;
      const html = renderBrandedEmail(
        `Bem-vindo a ${org.name}`,
        `
          <p>Olá, ${name}!</p>
          <p>Você foi convidado para acessar a plataforma Olive Labs na organização <strong>${org.name}</strong>.</p>
          <p>Suas credenciais de acesso:</p>
          <ul style="line-height:1.8;">
            <li><strong>E-mail:</strong> ${email}</li>
            <li><strong>Senha temporária:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${password}</code></li>
          </ul>
          <p style="text-align:center;margin:28px 0;">
            <a href="${loginUrl}" style="background:#94C020;color:#0a0f0a;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Acessar plataforma</a>
          </p>
          <p style="font-size:12px;color:#6b6f76;">Por segurança, troque sua senha logo no primeiro acesso em "Meu Perfil".</p>
        `
      );
      await sendMail({
        to: email,
        subject: `Seu acesso a ${org.name} — Olive Labs`,
        html,
      });
    }

    return Response.json({ data: membership }, { status: 201 });
  } catch (e) {
    console.error("[admin/usuarios] create error:", e);
    return errorResponse("Erro ao criar usuário", 500);
  }
}
