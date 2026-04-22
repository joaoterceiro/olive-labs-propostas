import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgId, errorResponse } from "@/lib/prisma-tenant";
import { z } from "zod";

export async function GET() {
  try {
    const orgId = await requireOrgId();
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return errorResponse("Organização não encontrada", 404);
    return Response.json({ data: org });
  } catch {
    return errorResponse("Unauthorized", 401);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  primaryColor: z.string().optional().nullable(),
  defaultHeaderImage: z.string().optional().nullable(),
  defaultFooterImage: z.string().optional().nullable(),
});

export async function PUT(request: Request) {
  try {
    const session = await requireSession();
    const orgId = session.organizationId;
    if (session.orgRole !== "ADMIN" && !session.isSuperAdmin) {
      return errorResponse("Apenas administradores podem alterar configurações", 403);
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.message);
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: parsed.data,
    });

    return Response.json({ data: org, message: "Configurações atualizadas" });
  } catch (e) {
    console.error("[configuracoes] PUT error:", e);
    return errorResponse("Erro ao atualizar configurações", 500);
  }
}
