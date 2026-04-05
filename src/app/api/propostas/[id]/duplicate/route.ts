import { prisma } from "@/lib/prisma";
import {
  requireSession,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/prisma-tenant";
import { genProposalNumber } from "@/lib/utils";

// ── POST  /api/propostas/[id]/duplicate ─────────────────────────────────────

export async function POST(
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

  const original = await prisma.proposal.findFirst({
    where: { id, organizationId: orgId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!original) return notFoundResponse();

  // Generate new proposal number
  const lastProposal = await prisma.proposal.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });

  let nextSeq = 1;
  if (lastProposal?.number) {
    const parts = lastProposal.number.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }

  const proposalNumber = genProposalNumber(session.orgSlug, nextSeq);

  const duplicated = await prisma.$transaction(async (tx) => {
    const created = await tx.proposal.create({
      data: {
        organizationId: orgId,
        number: proposalNumber,
        clientName: `${original.clientName} (copia)`,
        projectName: original.projectName,
        date: new Date(),
        observations: original.observations,
        status: "DRAFT",
        userId: session.id,
        clientId: original.clientId,
        totalValue: original.totalValue,
        totalHours: original.totalHours,
        items: {
          create: original.items.map((item, index) => ({
            serviceId: item.serviceId,
            serviceName: item.serviceName,
            description: item.description,
            customName: item.customName,
            customDescription: item.customDescription,
            hours: item.hours,
            hourlyRate: item.hourlyRate,
            subtotal: item.subtotal,
            selectedDeliverables: item.selectedDeliverables,
            sortOrder: index,
          })),
        },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        client: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return created;
  });

  return Response.json(duplicated, { status: 201 });
}
