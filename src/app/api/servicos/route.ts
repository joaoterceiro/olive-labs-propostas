import { prisma } from "@/lib/prisma";
import {
  requireOrgId,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/prisma-tenant";
import { z } from "zod";

const createServiceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(120),
  description: z.string().max(500).optional(),
  deliverables: z.array(z.string().min(1).max(120)).default([]),
});

export async function GET() {
  try {
    const orgId = await requireOrgId();

    const services = await prisma.service.findMany({
      where: { organizationId: orgId },
      orderBy: { sortOrder: "asc" },
    });

    return Response.json(services);
  } catch {
    return unauthorizedResponse();
  }
}

export async function POST(request: Request) {
  try {
    const orgId = await requireOrgId();

    const body = await request.json();
    const parsed = createServiceSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 422);
    }

    const { name, description, deliverables } = parsed.data;

    // Get the next sortOrder
    const lastService = await prisma.service.findFirst({
      where: { organizationId: orgId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const service = await prisma.service.create({
      data: {
        organizationId: orgId,
        name,
        description: description ?? null,
        deliverables,
        sortOrder: (lastService?.sortOrder ?? -1) + 1,
      },
    });

    return Response.json(service, { status: 201 });
  } catch {
    return unauthorizedResponse();
  }
}
