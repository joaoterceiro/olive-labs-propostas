import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/prisma-tenant";

export const dynamic = "force-dynamic";

/**
 * Expire proposals in SENT status whose date is older than 30 days.
 * Protected by CRON_SECRET header (Bearer token).
 */
export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return errorResponse("Unauthorized", 401);
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const result = await prisma.proposal.updateMany({
    where: {
      status: "SENT",
      date: { lt: cutoff },
    },
    data: { status: "EXPIRED" },
  });

  return Response.json({ ok: true, expired: result.count });
}

// Allow GET for easy triggering via EasyPanel scheduled HTTP check
export const GET = POST;
