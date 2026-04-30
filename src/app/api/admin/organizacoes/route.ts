import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
  unauthorizedResponse,
  forbiddenResponse,
  errorResponse,
} from "@/lib/prisma-tenant";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _forbiddenResponse = forbiddenResponse;

const createOrgSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Slug invalido (use apenas a-z, 0-9 e hifens)"),
  email: z.string().email().max(180).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  cnpj: z.string().max(20).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  state: z.string().max(2).optional().nullable(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor invalida (use formato #RRGGBB)")
    .optional()
    .nullable(),
});

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON invalido", 400);
  }
  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const { name, slug, email, phone, cnpj, city, state, primaryColor } =
    parsed.data;

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
