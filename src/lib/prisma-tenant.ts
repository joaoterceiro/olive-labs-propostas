import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import type { SessionUser } from "@/types";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireOrgId(): Promise<string> {
  const user = await requireSession();
  if (!user.organizationId) throw new Error("No organization");
  return user.organizationId;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (!user.isSuperAdmin) throw new Error("Forbidden");
  return user;
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbiddenResponse() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

export function notFoundResponse() {
  return Response.json({ error: "Not found" }, { status: 404 });
}

export function errorResponse(message: string, status: number = 400) {
  return Response.json({ error: message }, { status });
}
