import { prisma } from "@/lib/prisma";
import {
  requireOrgId,
  unauthorizedResponse,
  errorResponse,
} from "@/lib/prisma-tenant";
import { z } from "zod";

// ── GET  /api/clientes ──────────────────────────────────────────────────────
export async function GET(request: Request) {
  let orgId: string;
  try {
    orgId = await requireOrgId();
  } catch {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { organizationId: orgId };

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { companyName: "asc" },
      skip,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  return Response.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

// ── POST  /api/clientes ─────────────────────────────────────────────────────
const createSchema = z.object({
  companyName: z.string().min(1, "Nome da empresa obrigatorio"),
  contactName: z.string().optional(),
  email: z.string().email("E-mail invalido").optional().or(z.literal("")),
  phone: z.string().optional(),
  cnpj: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  let orgId: string;
  try {
    orgId = await requireOrgId();
  } catch {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON invalido", 400);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { email, ...rest } = parsed.data;

  const client = await prisma.client.create({
    data: {
      ...rest,
      email: email || undefined,
      organizationId: orgId,
    },
  });

  return Response.json(client, { status: 201 });
}
