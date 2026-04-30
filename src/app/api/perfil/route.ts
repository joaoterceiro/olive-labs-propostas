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

// E-mail intentionally NOT in this schema: changing your own login identity
// without re-auth opens an account-takeover surface (an XSS / session-fixation
// could rewrite the email and then trigger a password reset). Route a future
// /api/perfil/email flow through password re-confirmation if needed.
const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  avatarUrl: z.string().max(500).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
});

export async function PUT(request: Request) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return errorResponse("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON invalido", 400);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.id },
      data: parsed.data,
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
  } catch (e) {
    console.error("[perfil] PUT error:", e);
    return errorResponse("Erro ao atualizar perfil", 500);
  }
}
