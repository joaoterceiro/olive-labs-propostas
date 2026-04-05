import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/prisma-tenant";
import { hashSync } from "bcryptjs";
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
  password: z.string().min(6, "Mínimo 6 caracteres"),
  organizationId: z.string().min(1, "Selecione uma organização"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
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
      return errorResponse(parsed.error.message);
    }

    const { name, email, password, organizationId, role } = parsed.data;

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

    return Response.json({ data: membership }, { status: 201 });
  } catch {
    return errorResponse("Erro ao criar usuário", 500);
  }
}
