import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrgId, unauthorizedResponse } from "@/lib/prisma-tenant";

export const dynamic = "force-dynamic";

// Cap the query term so an attacker can't pin our DB CPU on three
// case-insensitive `contains` scans with a 100 KB string.
const querySchema = z.object({
  q: z.string().min(2).max(120),
});

const EMPTY_RESULT = { proposals: [], clients: [], services: [] };

export async function GET(request: Request) {
  let orgId: string;
  try {
    orgId = await requireOrgId();
  } catch {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ q: (searchParams.get("q") || "").trim() });
  if (!parsed.success) {
    return Response.json(EMPTY_RESULT);
  }
  const q = parsed.data.q;

  const [proposals, clients, services] = await Promise.all([
    prisma.proposal.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { number: { contains: q, mode: "insensitive" } },
          { clientName: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
          { projectName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        number: true,
        clientName: true,
        projectName: true,
        status: true,
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { companyName: { contains: q, mode: "insensitive" } },
          { contactName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        companyName: true,
        contactName: true,
      },
      take: 5,
      orderBy: { companyName: "asc" },
    }),
    prisma.service.findMany({
      where: {
        organizationId: orgId,
        name: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
      },
      take: 5,
      orderBy: { name: "asc" },
    }),
  ]);

  return Response.json({ proposals, clients, services });
}
