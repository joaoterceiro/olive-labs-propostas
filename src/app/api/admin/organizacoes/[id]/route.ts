import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/prisma-tenant";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, isActive: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!org) {
    return notFoundResponse();
  }

  return Response.json({ data: org });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) {
    return notFoundResponse();
  }

  const body = await request.json();
  const { name, slug, email, phone, cnpj, city, state, primaryColor, isActive } = body;

  if (slug && slug !== existing.slug) {
    const slugTaken = await prisma.organization.findUnique({ where: { slug } });
    if (slugTaken) {
      return errorResponse("Já existe uma organização com este slug.", 409);
    }
  }

  if (cnpj && cnpj !== existing.cnpj) {
    const cnpjTaken = await prisma.organization.findUnique({ where: { cnpj } });
    if (cnpjTaken) {
      return errorResponse("Já existe uma organização com este CNPJ.", 409);
    }
  }

  const org = await prisma.organization.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(email !== undefined && { email: email || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(cnpj !== undefined && { cnpj: cnpj || null }),
      ...(city !== undefined && { city: city || null }),
      ...(state !== undefined && { state: state || null }),
      ...(primaryColor !== undefined && { primaryColor }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return Response.json({ data: org });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: { _count: { select: { proposals: true } } },
  });

  if (!org) {
    return notFoundResponse();
  }

  if (org._count.proposals > 0) {
    return errorResponse(
      `Não é possível excluir: a organização possui ${org._count.proposals} proposta(s).`,
      409
    );
  }

  await prisma.organization.delete({ where: { id } });

  return Response.json({ message: "Organização excluída com sucesso." });
}
