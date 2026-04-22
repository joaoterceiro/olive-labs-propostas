import { prisma } from "@/lib/prisma";
import {
  requireSession,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/prisma-tenant";
import { genProposalNumber } from "@/lib/utils";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  id: z.string().optional(),
  serviceId: z.string().optional(),
  serviceName: z.string().min(1, "Nome do servico obrigatorio").max(240),
  description: z.string().max(2000).optional(),
  customName: z.string().max(240).optional(),
  customDescription: z.string().max(2000).optional(),
  hours: z
    .number()
    .positive("Horas deve ser positivo")
    .max(10000, "Horas muito alto"),
  hourlyRate: z
    .number()
    .nonnegative("Valor/hora deve ser >= 0")
    .max(999999, "Valor/hora muito alto"),
  selectedDeliverables: z.array(z.string().max(240)).default([]),
});

const updateProposalSchema = z.object({
  companyName: z.string().max(240).nullable().optional(),
  clientName: z.string().min(1, "Nome do cliente obrigatorio").max(240).optional(),
  projectName: z.string().min(1, "Nome do projeto obrigatorio").max(240).optional(),
  date: z.string().optional(),
  observations: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "SENT", "APPROVED", "REJECTED", "EXPIRED"]).optional(),
  clientId: z.string().nullable().optional(),
  pdfUrl: z.string().nullable().optional(),
  items: z.array(itemSchema).optional(),
  headerImageUrl: z.string().nullable().optional(),
  footerImageUrl: z.string().nullable().optional(),
  bodyImages: z.array(z.object({
    id: z.string(),
    url: z.string(),
    caption: z.string(),
    position: z.string(),
    width: z.number(),
  })).nullable().optional(),
  contentBlocks: z.array(z.object({
    id: z.string(),
    type: z.string(),
    order: z.number(),
    content: z.string().optional(),
    url: z.string().optional(),
    caption: z.string().optional(),
    width: z.number().optional(),
  })).nullable().optional(),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

async function findOwnedProposal(id: string, orgId: string) {
  return prisma.proposal.findFirst({
    where: { id, organizationId: orgId },
  });
}

function calculateTotals(items: z.infer<typeof itemSchema>[]) {
  let totalHours = new Prisma.Decimal(0);
  let totalValue = new Prisma.Decimal(0);

  const itemsData = items.map((item, index) => {
    const hours = new Prisma.Decimal(item.hours);
    const hourlyRate = new Prisma.Decimal(item.hourlyRate);
    const subtotal = hours.mul(hourlyRate);
    totalHours = totalHours.add(hours);
    totalValue = totalValue.add(subtotal);

    return {
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

  return { itemsData, totalHours, totalValue };
}

// ── GET  /api/propostas/[id] ────────────────────────────────────────────────

export async function GET(
  _request: Request,
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

  const proposal = await prisma.proposal.findFirst({
    where: { id, organizationId: orgId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      client: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!proposal) return notFoundResponse();

  return Response.json(proposal);
}

// ── PUT  /api/propostas/[id] ────────────────────────────────────────────────

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

  const existing = await findOwnedProposal(id, orgId);
  if (!existing) return notFoundResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON invalido", 400);
  }

  const parsed = updateProposalSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { items, ...fields } = parsed.data;

  // Build update data
  const updateData: Record<string, unknown> = {};

  if (fields.companyName !== undefined) updateData.companyName = fields.companyName;
  if (fields.clientName !== undefined) updateData.clientName = fields.clientName;
  if (fields.projectName !== undefined) updateData.projectName = fields.projectName;
  if (fields.date !== undefined) updateData.date = new Date(fields.date);
  if (fields.observations !== undefined) updateData.observations = fields.observations;
  if (fields.clientId !== undefined) updateData.clientId = fields.clientId;
  if (fields.pdfUrl !== undefined) updateData.pdfUrl = fields.pdfUrl;
  if (fields.headerImageUrl !== undefined) updateData.headerImageUrl = fields.headerImageUrl;
  if (fields.footerImageUrl !== undefined) updateData.footerImageUrl = fields.footerImageUrl;
  if (fields.bodyImages !== undefined) updateData.bodyImages = fields.bodyImages;
  if (fields.contentBlocks !== undefined) updateData.contentBlocks = fields.contentBlocks;

  if (fields.status !== undefined) {
    updateData.status = fields.status;
    if (fields.status === "SENT") updateData.sentAt = new Date();
    if (fields.status === "APPROVED") updateData.approvedAt = new Date();
    if (fields.status === "REJECTED") updateData.rejectedAt = new Date();
  }

  const proposal = await prisma.$transaction(async (tx) => {
    // If items provided, diff against existing to preserve stable item IDs.
    if (items && items.length > 0) {
      const { itemsData, totalHours, totalValue } = calculateTotals(items);
      updateData.totalHours = totalHours;
      updateData.totalValue = totalValue;

      const existing = await tx.proposalItem.findMany({
        where: { proposalId: id },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((e) => e.id));

      const clientIds = new Set(
        items.map((i) => i.id).filter((x): x is string => !!x)
      );
      const toDelete = existing
        .map((e) => e.id)
        .filter((existingId) => !clientIds.has(existingId));

      if (toDelete.length > 0) {
        await tx.proposalItem.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      for (let i = 0; i < items.length; i++) {
        const clientItem = items[i];
        const data = itemsData[i];
        if (clientItem.id && existingIds.has(clientItem.id)) {
          await tx.proposalItem.update({
            where: { id: clientItem.id },
            data,
          });
        } else {
          await tx.proposalItem.create({
            data: { ...data, proposalId: id },
          });
        }
      }

      const updated = await tx.proposal.update({
        where: { id },
        data: updateData,
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          client: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });
      return updated;
    }

    // No items update, just update fields
    const updated = await tx.proposal.update({
      where: { id },
      data: updateData,
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return updated;
  });

  return Response.json(proposal);
}

// ── DELETE  /api/propostas/[id] ─────────────────────────────────────────────

export async function DELETE(
  _request: Request,
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

  const existing = await findOwnedProposal(id, orgId);
  if (!existing) return notFoundResponse();

  // Items cascade-delete via schema onDelete: Cascade
  await prisma.proposal.delete({ where: { id } });

  return Response.json({ success: true });
}
