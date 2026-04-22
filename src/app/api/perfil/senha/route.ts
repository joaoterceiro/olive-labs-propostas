import { prisma } from "@/lib/prisma";
import { requireSession, errorResponse } from "@/lib/prisma-tenant";
import { passwordSchema } from "@/lib/password";
import { compare, hash } from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1, "Senha atual obrigatoria"),
  newPassword: passwordSchema,
});

export async function PUT(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || "Dados invalidos");
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { passwordHash: true },
    });
    if (!user) return errorResponse("User not found", 404);

    const valid = await compare(currentPassword, user.passwordHash);
    if (!valid) {
      return errorResponse("Senha atual incorreta", 400);
    }

    const newHash = await hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.id },
      data: { passwordHash: newHash },
    });

    return Response.json({ message: "Senha alterada com sucesso" });
  } catch (e) {
    console.error("[perfil/senha] error:", e);
    return errorResponse("Erro ao alterar senha", 500);
  }
}
