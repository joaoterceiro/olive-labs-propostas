import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import type { SessionUser } from "@/types";
import type { Proposal } from "@/generated/prisma/client";

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

/**
 * Requires the caller to be an ADMIN of the active organization
 * (or a platform super-admin). Used to gate destructive/privileged
 * operations inside a tenant.
 */
export async function requireOrgAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.isSuperAdmin) return user;
  if (!user.organizationId) throw new Error("No organization");
  if (user.orgRole !== "ADMIN") throw new Error("Forbidden");
  return user;
}

/**
 * Loads a proposal scoped to the caller's organization and verifies the
 * caller has write access. Returns { session, proposal }.
 *
 * Write access = the caller is the proposal's creator, OR an ADMIN of the
 * organization, OR a platform super-admin. Other org members can read but
 * not modify someone else's proposal.
 *
 * Throws:
 *  - "Unauthorized"       when no session
 *  - "No organization"    when the session has no active org
 *  - "Not found"          when the proposal doesn't exist or belongs to a
 *                         different org (treated the same to avoid leaking
 *                         existence cross-tenant)
 *  - "Forbidden"          when the caller is in the right org but cannot
 *                         edit this specific proposal
 */
export async function requireProposalEditor(
  proposalId: string
): Promise<{ session: SessionUser; proposal: Proposal }> {
  const session = await requireSession();
  if (!session.organizationId) throw new Error("No organization");
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, organizationId: session.organizationId },
  });
  if (!proposal) throw new Error("Not found");
  const isCreator = proposal.userId === session.id;
  const isPrivileged = session.orgRole === "ADMIN" || session.isSuperAdmin;
  if (!isCreator && !isPrivileged) throw new Error("Forbidden");
  return { session, proposal };
}

/**
 * Translates an error thrown by `requireProposalEditor` into the right
 * HTTP response. Use it inside a single catch around the helper call.
 */
export function proposalAuthError(err: unknown): Response {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "Not found") return notFoundResponse();
  if (msg === "Forbidden" || msg === "No organization")
    return forbiddenResponse();
  return unauthorizedResponse();
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
