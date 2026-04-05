import { prisma } from "@/lib/prisma";
import {
  requireOrgId,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/prisma-tenant";
import { z } from "zod";

// ── helpers ──────────────────────────────────────────────────────────────────
async function findOwnedClient(id: string, orgId: string) {
  return prisma.client.findFirst({
    where: { id, organizationId: orgId },
  });
}

// ── GET  /api/clientes/[id] ─────────────────────────────────────────────────
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let orgId: string;
  try {
    orgId = await requireOrgId();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: { id, organizationId: orgId },
    include: {
      _count: { select: { proposals: true } },
    },
  });

  if (!client) return notFoundResponse();

  return Response.json(client);
}

// ── PUT  /api/clientes/[id] ─────────────────────────────────────────────────
const updateSchema = z.object({
  companyName: z.string().min(1, "Nome da empresa obrigatorio").optional(),
  contactName: z.string().optional(),
  email: z.string().email("E-mail invalido").optional().or(z.literal("")),
  phone: z.string().optional(),
  cnpj: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let orgId: string;
  try {
    orgId = await requireOrgId();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const existing = await findOwnedClient(id, orgId);
  if (!existing) return notFoundResponse();

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

  const updated = await prisma.client.update({
    where: { id },
    data: parsed.data,
  });

  return Response.json(updated);
}

// ── DELETE  /api/clientes/[id] ──────────────────────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let orgId: string;
  try {
    orgId = await requireOrgId();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const existing = await findOwnedClient(id, orgId);
  if (!existing) return notFoundResponse();

  const proposalCount = await prisma.proposal.count({
    where: { clientId: id },
  });

  if (proposalCount > 0) {
    return errorResponse(
      `Nao e possivel excluir: cliente possui ${proposalCount} proposta(s) vinculada(s).`,
      409
    );
  }

  await prisma.client.delete({ where: { id } });

  return Response.json({ success: true });
}
