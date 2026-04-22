import { prisma } from "@/lib/prisma";
import { requireOrgId, unauthorizedResponse } from "@/lib/prisma-tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let orgId: string;
  try {
    orgId = await requireOrgId();
  } catch {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return Response.json({ proposals: [], clients: [], services: [] });
  }

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
