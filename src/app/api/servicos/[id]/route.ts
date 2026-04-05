import { prisma } from "@/lib/prisma";
import {
  requireOrgId,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/prisma-tenant";
import { z } from "zod";

const updateServiceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  deliverables: z.array(z.string().min(1).max(120)).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await requireOrgId();
    const { id } = await params;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== orgId) {
      return notFoundResponse();
    }

    const body = await request.json();
    const parsed = updateServiceSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 422);
    }

    const service = await prisma.service.update({
      where: { id },
      data: parsed.data,
    });

    return Response.json(service);
  } catch {
    return unauthorizedResponse();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await requireOrgId();
    const { id } = await params;

    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== orgId) {
      return notFoundResponse();
    }

    // Check if service is referenced by proposal items
    const itemCount = await prisma.proposalItem.count({
      where: { serviceId: id },
    });

    if (itemCount > 0) {
      return errorResponse(
        `Este serviço está vinculado a ${itemCount} item(ns) de proposta e não pode ser excluído.`,
        409
      );
    }

    await prisma.service.delete({ where: { id } });

    return Response.json({ success: true });
  } catch {
    return unauthorizedResponse();
  }
}
