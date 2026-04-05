import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
  unauthorizedResponse,
  forbiddenResponse,
  errorResponse,
} from "@/lib/prisma-tenant";

export async function GET() {
  try {
    await requireSuperAdmin();
  } catch {
    return unauthorizedResponse();
  }

  const orgs = await prisma.organization.findMany({
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = orgs.map((org) => ({
    ...org,
    membersCount: org._count.members,
    _count: undefined,
  }));

  return Response.json({ data });
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
  } catch {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const { name, slug, email, phone, cnpj, city, state, primaryColor } = body;

  if (!name || !slug) {
    return errorResponse("Nome e slug são obrigatórios.");
  }

  const existing = await prisma.organization.findUnique({
    where: { slug },
  });

  if (existing) {
    return errorResponse("Já existe uma organização com este slug.", 409);
  }

  if (cnpj) {
    const existingCnpj = await prisma.organization.findUnique({
      where: { cnpj },
    });
    if (existingCnpj) {
      return errorResponse("Já existe uma organização com este CNPJ.", 409);
    }
  }

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      email: email || null,
      phone: phone || null,
      cnpj: cnpj || null,
      city: city || null,
      state: state || null,
      primaryColor: primaryColor || "#94C020",
    },
  });

  return Response.json({ data: org }, { status: 201 });
}
