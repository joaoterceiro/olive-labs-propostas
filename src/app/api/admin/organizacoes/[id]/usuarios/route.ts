import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/prisma-tenant";
import { hashSync } from "bcryptjs";

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

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return notFoundResponse();
  }

  const members = await prisma.membership.findMany({
    where: { organizationId: id },
    include: {
      user: {
        select: { id: true, name: true, email: true, isActive: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json({ data: members });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();
  } catch {
    return unauthorizedResponse();
  }

  const { id } = await params;

  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return notFoundResponse();
  }

  const body = await request.json();
  const { name, email, password, role } = body;

  if (!name || !email || !password) {
    return errorResponse("Nome, email e senha são obrigatórios.");
  }

  if (role && !["ADMIN", "MEMBER"].includes(role)) {
    return errorResponse("Role deve ser ADMIN ou MEMBER.");
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const passwordHash = hashSync(password, 10);
    user = await prisma.user.create({
      data: { name, email, passwordHash },
    });
  }

  const existingMembership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: id,
      },
    },
  });

  if (existingMembership) {
    return errorResponse("Usuário já é membro desta organização.", 409);
  }

  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      organizationId: id,
      role: role || "MEMBER",
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, isActive: true },
      },
    },
  });

  return Response.json({ data: membership }, { status: 201 });
}
