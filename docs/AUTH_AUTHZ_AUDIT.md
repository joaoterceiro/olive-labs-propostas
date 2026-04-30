# Authentication & Authorization Audit

**Scope:** every API route + middleware + the auth helpers in
`src/lib/prisma-tenant.ts`.
**Stack:** Next.js 16 middleware + NextAuth 4 (Credentials, JWT 30 d) +
custom guards + Prisma tenant filter.
**Date:** 2026-04-22
**Verdict:** ✅ All endpoints are authenticated. ⚠️ 4 places drift from
least-privilege — none catastrophic, but worth tightening before scale.

---

## Coverage matrix (26 routes × verbs)

| Routes | Guard | Status |
|---|---|---|
| 11 `/api/admin/*` | `requireSuperAdmin` | ✅ + middleware double-gate on `/api/admin` |
| 5 tenant CRUD (`clientes`, `servicos`, `search`) | `requireOrgId` | ✅ DELETE uses `requireOrgAdmin` (clientes, servicos) |
| 12 proposal-related (`/api/propostas/*` + `/upload` + `/pdf`) | `requireSession` + manual org check | 🟡 (see F1) |
| 2 `/perfil*` | `requireSession`, scoped to `session.id` | ✅ |
| 1 `/configuracoes` PUT | `requireSession` + inline ADMIN check | 🟡 (see F4) |
| 1 `/cron/expire-proposals` | Bearer token (`CRON_SECRET`) | ✅ (LOW: not constant-time, see SECURITY_REVIEW M-5) |
| 1 `/health` | none — public | ✅ intentional |
| 3 `/api/auth/*` (nextauth + reset) | none — public | ✅ intentional, rate-limited |

Every protected route is **double-gated**:
1. `src/middleware.ts` rejects unauthenticated requests at the edge (returns 401 JSON for `/api/*`, redirects to `/login` for pages).
2. The route handler re-checks via `requireSession()` / `requireOrgId()` / `requireSuperAdmin()` — so even if the middleware matcher ever misses, the handler still refuses.

---

## 🟠 Findings against least-privilege

### F1 — Any MEMBER can edit/delete/send any proposal in their org
- **Files:**
  - `src/app/api/propostas/[id]/route.ts` (PUT, DELETE)
  - `src/app/api/propostas/[id]/items/route.ts` (POST, PUT, DELETE)
  - `src/app/api/propostas/[id]/send/route.ts` (POST)
  - `src/app/api/propostas/[id]/duplicate/route.ts` (POST)
- **Today:** the auth helper is `requireSession()`, then `findOwnedProposal(id, orgId)` filters by `organizationId`. The proposal's `userId` (creator) is **never compared to `session.id`**.
- **Impact:** any authenticated MEMBER of the same org can delete a teammate's proposal, change its items, send it to an arbitrary email, or duplicate it. Multi-user collab may want this for ADMINs but not for MEMBERs.
- **Fix:** add `requireProposalEditor(proposalId)` helper that returns the proposal only if the caller is `proposal.userId === session.id` OR `orgRole === "ADMIN"` OR `isSuperAdmin`:
  ```ts
  // src/lib/prisma-tenant.ts
  export async function requireProposalEditor(proposalId: string) {
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
  ```
  Replace the `findOwnedProposal` calls in PUT, DELETE, items, send, duplicate.

  *Read* (GET) routes can stay org-scoped — viewing a teammate's proposal is fine.

### F2 — `/api/upload` doesn't enforce per-org quota
- **File:** `src/app/api/upload/route.ts`
- **Today:** any authenticated user can upload any number of 10 MB files. The key is prefixed with `orgId`, so tenant separation is intact, but a malicious member can fill the bucket.
- **Impact:** storage exhaustion (DoS by cost).
- **Fix:** Redis-backed counter (`rl:upload:${orgId}:${YYYY-MM-DD}`) with a per-day cap (e.g. 200 files/day) using the existing `lib/rate-limit`:
  ```ts
  const limit = await rateLimit(`upload:${orgId}`, 200, 86400);
  if (!limit.success) return rateLimitResponse(limit);
  ```

### F3 — `/api/configuracoes` PUT inlines the ADMIN check instead of using the helper
- **File:** `src/app/api/configuracoes/route.ts`
- **Today:** `if (session.orgRole !== "ADMIN" && !session.isSuperAdmin)` — works, but duplicates the logic of `requireOrgAdmin`.
- **Fix:** swap to `await requireOrgAdmin()`. Single source of truth, easier to audit later.

### F4 — Proposal routes use `requireSession` instead of `requireOrgId`
- **Files:** all `/api/propostas/*` and `/api/upload`, `/api/pdf`
- **Today:** every handler does:
  ```ts
  const session = await requireSession();
  const orgId = session.organizationId;
  if (!orgId) return unauthorizedResponse();
  ```
- **Risk:** if a future contributor forgets the `if (!orgId)` line, the query becomes `WHERE organizationId = undefined` → Prisma may match no rows or, with raw SQL, may match something else. `requireOrgId()` returns the string directly and throws otherwise — fewer footguns.
- **Fix:** mechanical migration of the pattern to `const orgId = await requireOrgId();`. Same auth surface, less ceremony.

---

## ✅ What's correctly tight already

- **Middleware** (`src/middleware.ts`):
  - PUBLIC_PATHS list is short and explicit (`/login`, `/esqueci-senha`, `/redefinir-senha`, `/api/auth`, `/api/health`).
  - Super-admin gate fires BEFORE the protected handler runs.
  - 401 JSON for `/api/*`, redirect for pages — correct semantics for SPA + browser.
- **Helpers** (`src/lib/prisma-tenant.ts`):
  - `requireSession`, `requireOrgId`, `requireOrgAdmin`, `requireSuperAdmin` form a clear ladder.
  - `requireOrgAdmin` correctly accepts super-admin as a privilege upgrade.
- **Mass-assignment**: closed in `INPUT_VALIDATION_AUDIT` F5 (admin user PATCH).
- **Self-protection**: `admin/usuarios/[id]` PUT and DELETE both refuse to act on `isSuperAdmin = true` rows — prevents super-admin lock-out + accidental privilege deletion.
- **Cross-tenant leak**: every Prisma query that touches user data carries `organizationId: orgId` (verified by the tenant-filter sweep — only `/admin/*` routes legitimately omit it because they operate cross-org under `requireSuperAdmin`).
- **Login**: `bcrypt` hash check + 5-attempt-per-email rate limit + email lowercasing + `isActive` check.
- **Password reset**: 32-byte token, sha256-stored, single-use, 1 h expiry, FK CASCADE on user delete.
- **Admin invites**: now use single-use reset link instead of plaintext (after H-3 fix in `SECURITY_REVIEW`).

---

## Suggested hardening order

| # | Fix | Effort | Impact |
|---|---|---|---|
| F1 | `requireProposalEditor` helper + 5 callers | 1 h | Blocks teammate-edits-without-permission |
| F2 | Redis quota on `/api/upload` | 20 min | Prevents storage DoS |
| F3 | Swap inline ADMIN check → `requireOrgAdmin` | 5 min | Code quality + future-proof |
| F4 | Migrate proposal routes to `requireOrgId` | 30 min | Removes class of "forgot the orgId guard" footguns |

None blocks deployment. F1 is the only one that changes user-visible behavior (MEMBERs lose write on others' proposals) — confirm the product intent before shipping.

---

## Principle of least privilege — current model

```
SuperAdmin (cross-org, platform-wide)
  └── /admin/*  (org/user CRUD across all tenants)
ADMIN of org (membership.role === "ADMIN")
  ├── /configuracoes PUT     (org settings)
  ├── /clientes/[id] DELETE  (delete client)
  ├── /servicos/[id] DELETE  (delete service)
  └── + everything a MEMBER can do
MEMBER of org (membership.role === "MEMBER")
  ├── /propostas (full CRUD on org's proposals — F1 wants to scope to creator)
  ├── /clientes (CRUD except delete)
  ├── /servicos (CRUD except delete)
  ├── /perfil (self-update)
  └── /api/upload, /api/pdf, /api/search
Anonymous
  ├── /login, /esqueci-senha, /redefinir-senha
  ├── /api/auth/*, /api/health
  └── (all other paths blocked by middleware)
```

Endpoints follow the ladder cleanly except for the F1 case (proposal write
isn't scoped per-creator).
