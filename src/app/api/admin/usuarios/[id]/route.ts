import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/prisma-tenant";

// Strict allow-list: this endpoint can only flip the active flag.
// Without zod, passing { passwordHash, isSuperAdmin, ... } in the body would
// be silently accepted by Prisma — classic mass-assignment.
const togglerSchema = z.object({
  isActive: z.boolean().optional(),
});

// PUT /api/admin/usuarios/[id] — toggle isActive (block/unblock)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return notFoundResponse();

  if (user.isSuperAdmin) {
    return errorResponse("Não é possível bloquear um Super Admin", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = togglerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const { isActive } = parsed.data;

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: typeof isActive === "boolean" ? isActive : !user.isActive },
    select: { id: true, name: true, isActive: true },
  });

  return Response.json({
    data: updated,
    message: updated.isActive ? "Usuário desbloqueado" : "Usuário bloqueado",
  });
}

// DELETE /api/admin/usuarios/[id] — delete user + memberships
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { proposals: true } } },
  });

  if (!user) return notFoundResponse();

  if (user.isSuperAdmin) {
    return errorResponse("Não é possível excluir um Super Admin", 403);
  }

  if (user._count.proposals > 0) {
    return errorResponse(
      `Não é possível excluir: o usuário possui ${user._count.proposals} proposta(s). Bloqueie o usuário em vez de excluir.`,
      409
    );
  }

  await prisma.user.delete({ where: { id } });

  return Response.json({ message: "Usuário excluído com sucesso" });
}
