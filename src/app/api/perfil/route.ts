import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/prisma-tenant";
import { z } from "zod";

export async function GET() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        phone: true,
        createdAt: true,
        memberships: {
          include: {
            organization: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!user) return errorResponse("User not found", 404);
    return Response.json({ data: user });
  } catch {
    return errorResponse("Unauthorized", 401);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

export async function PUT(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.message);
    }

    const { email, ...rest } = parsed.data;

    // Check email uniqueness if changed
    if (email && email !== session.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== session.id) {
        return errorResponse("E-mail já está em uso", 400);
      }
    }

    const user = await prisma.user.update({
      where: { id: session.id },
      data: {
        ...rest,
        ...(email ? { email } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        phone: true,
        createdAt: true,
        memberships: {
          include: {
            organization: { select: { id: true, name: true } },
          },
        },
      },
    });

    return Response.json({ data: user, message: "Perfil atualizado" });
  } catch {
    return errorResponse("Erro ao atualizar perfil", 500);
  }
}
