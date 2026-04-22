import { prisma } from "@/lib/prisma";
import {
  requireSession,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/prisma-tenant";
import { genProposalNumber } from "@/lib/utils";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────────────────

const itemSchema = z.object({
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

const createProposalSchema = z.object({
  companyName: z.string().max(240).optional(),
  clientName: z.string().min(1, "Nome do cliente obrigatorio").max(240),
  projectName: z.string().min(1, "Nome do projeto obrigatorio").max(240),
  date: z.string().min(1, "Data obrigatoria"),
  observations: z.string().max(4000).optional(),
  clientId: z.string().optional(),
  items: z.array(itemSchema).min(1, "Ao menos um item obrigatorio"),
  headerImageUrl: z.string().optional(),
  footerImageUrl: z.string().optional(),
  bodyImages: z.array(z.object({
    id: z.string(),
    url: z.string(),
    caption: z.string(),
    position: z.string(),
    width: z.number(),
  })).optional(),
  contentBlocks: z.array(z.object({
    id: z.string(),
    type: z.string(),
    order: z.number(),
    content: z.string().optional(),
    url: z.string().optional(),
    caption: z.string().optional(),
    width: z.number().optional(),
  })).optional(),
});

// ── GET  /api/propostas ─────────────────────────────────────────────────────

export async function GET(request: Request) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return unauthorizedResponse();
  }

  const orgId = session.organizationId;
  if (!orgId) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status")?.toUpperCase();
  const search = searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { organizationId: orgId };

  if (status && ["DRAFT", "SENT", "APPROVED", "REJECTED", "EXPIRED"].includes(status)) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: "insensitive" } },
      { clientName: { contains: search, mode: "insensitive" } },
      { projectName: { contains: search, mode: "insensitive" } },
      { number: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.proposal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        _count: { select: { items: true } },
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.proposal.count({ where }),
  ]);

  return Response.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

// ── POST  /api/propostas ────────────────────────────────────────────────────

export async function POST(request: Request) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return unauthorizedResponse();
  }

  const orgId = session.organizationId;
  if (!orgId) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON invalido", 400);
  }

  const parsed = createProposalSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { companyName, clientName, projectName, date, observations, clientId, items, headerImageUrl, footerImageUrl, bodyImages, contentBlocks } = parsed.data;

  // Calculate totals from items
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

  // Atomic proposal number: retry if two concurrent requests race for the same sequence.
  const MAX_ATTEMPTS = 5;
  let proposal;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
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
    // Offset on retry so parallel workers settle on distinct numbers
    nextSeq += attempt;

    const proposalNumber = genProposalNumber(session.orgSlug, nextSeq);

    try {
      proposal = await prisma.$transaction(async (tx) => {
        return tx.proposal.create({
          data: {
            organizationId: orgId,
            number: proposalNumber,
            companyName: companyName ?? null,
            clientName,
            projectName,
            date: new Date(date),
            observations: observations ?? null,
            clientId: clientId || undefined,
            userId: session.id,
            totalValue,
            totalHours,
            headerImageUrl: headerImageUrl ?? null,
            footerImageUrl: footerImageUrl ?? null,
            bodyImages: bodyImages ?? undefined,
            contentBlocks: contentBlocks ?? undefined,
            items: {
              create: itemsData,
            },
          },
          include: {
            items: true,
            user: { select: { id: true, name: true, email: true } },
            client: true,
          },
        });
      });
      break;
    } catch (err) {
      lastError = err;
      // P2002 = unique constraint violation (most likely [organizationId, number])
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        continue;
      }
      throw err;
    }
  }

  if (!proposal) {
    console.error("[propostas] failed to allocate proposal number:", lastError);
    return errorResponse(
      "Nao foi possivel gerar o numero da proposta. Tente novamente.",
      503
    );
  }

  return Response.json(proposal, { status: 201 });
}
