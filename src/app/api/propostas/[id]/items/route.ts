import { prisma } from "@/lib/prisma";
import {
  requireSession,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/prisma-tenant";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────────────────

const addItemSchema = z.object({
  serviceId: z.string().optional(),
  serviceName: z.string().min(1, "Nome do servico obrigatorio"),
  description: z.string().optional(),
  customName: z.string().optional(),
  customDescription: z.string().optional(),
  hours: z.number().positive("Horas deve ser positivo"),
  hourlyRate: z.number().nonnegative("Valor/hora deve ser >= 0"),
  selectedDeliverables: z.array(z.string()).default([]),
});

const bulkItemSchema = z.object({
  items: z.array(addItemSchema).min(1, "Ao menos um item obrigatorio"),
});

const deleteItemSchema = z.object({
  itemId: z.string().min(1, "ID do item obrigatorio"),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

async function findOwnedProposal(id: string, orgId: string) {
  return prisma.proposal.findFirst({
    where: { id, organizationId: orgId },
  });
}

async function recalculateTotals(proposalId: string) {
  const items = await prisma.proposalItem.findMany({
    where: { proposalId },
    select: { hours: true, subtotal: true },
  });

  let totalHours = new Prisma.Decimal(0);
  let totalValue = new Prisma.Decimal(0);

  for (const item of items) {
    totalHours = totalHours.add(item.hours);
    totalValue = totalValue.add(item.subtotal);
  }

  return prisma.proposal.update({
    where: { id: proposalId },
    data: { totalHours, totalValue },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      client: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

// ── POST  /api/propostas/[id]/items ─────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return unauthorizedResponse();
  }

  const orgId = session.organizationId;
  if (!orgId) return unauthorizedResponse();

  const { id } = await params;

  const proposal = await findOwnedProposal(id, orgId);
  if (!proposal) return notFoundResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON invalido", 400);
  }

  const parsed = addItemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const item = parsed.data;
  const hours = new Prisma.Decimal(item.hours);
  const hourlyRate = new Prisma.Decimal(item.hourlyRate);
  const subtotal = hours.mul(hourlyRate);

  // Get next sortOrder
  const lastItem = await prisma.proposalItem.findFirst({
    where: { proposalId: id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.proposalItem.create({
    data: {
      proposalId: id,
      serviceId: item.serviceId || undefined,
      serviceName: item.serviceName,
      description: item.description ?? null,
      customName: item.customName ?? null,
      customDescription: item.customDescription ?? null,
      hours,
      hourlyRate,
      subtotal,
      selectedDeliverables: item.selectedDeliverables,
      sortOrder: (lastItem?.sortOrder ?? -1) + 1,
    },
  });

  const updated = await recalculateTotals(id);

  return Response.json(updated, { status: 201 });
}

// ── PUT  /api/propostas/[id]/items (bulk update) ────────────────────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return unauthorizedResponse();
  }

  const orgId = session.organizationId;
  if (!orgId) return unauthorizedResponse();

  const { id } = await params;

  const proposal = await findOwnedProposal(id, orgId);
  if (!proposal) return notFoundResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON invalido", 400);
  }

  const parsed = bulkItemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { items } = parsed.data;

  let totalHours = new Prisma.Decimal(0);
  let totalValue = new Prisma.Decimal(0);

  const itemsData = items.map((item, index) => {
    const hours = new Prisma.Decimal(item.hours);
    const hourlyRate = new Prisma.Decimal(item.hourlyRate);
    const subtotal = hours.mul(hourlyRate);
    totalHours = totalHours.add(hours);
    totalValue = totalValue.add(subtotal);

    return {
      proposalId: id,
      serviceId: item.serviceId || undefined,
      serviceName: item.serviceName,
      description: item.description ?? null,
      customName: item.customName ?? null,
      customDescription: item.customDescription ?? null,
      hours,
      hourlyRate,
      subtotal,
      selectedDeliverables: item.selectedDeliverables,
      sortOrder: index,
    };
  });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.proposalItem.deleteMany({ where: { proposalId: id } });

    for (const data of itemsData) {
      await tx.proposalItem.create({ data });
    }

    return tx.proposal.update({
      where: { id },
      data: { totalHours, totalValue },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  });

  return Response.json(updated);
}

// ── DELETE  /api/propostas/[id]/items ────────────────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return unauthorizedResponse();
  }

  const orgId = session.organizationId;
  if (!orgId) return unauthorizedResponse();

  const { id } = await params;

  const proposal = await findOwnedProposal(id, orgId);
  if (!proposal) return notFoundResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON invalido", 400);
  }

  const parsed = deleteItemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { itemId } = parsed.data;

  // Verify item belongs to this proposal
  const item = await prisma.proposalItem.findFirst({
    where: { id: itemId, proposalId: id },
  });

  if (!item) return notFoundResponse();

  await prisma.proposalItem.delete({ where: { id: itemId } });

  const updated = await recalculateTotals(id);

  return Response.json(updated);
}
