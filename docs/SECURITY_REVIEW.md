# Security Review — Olive Labs Proposal Generator

**Scope:** entire repository at `F:/gerador de propostas/gerador-app`
**Stack:** Next.js 16 + Prisma 7 + NextAuth 4 + bcryptjs + nodemailer + ioredis + minio + puppeteer + Tiptap
**Date:** 2026-04-22
**Reviewer:** ui-ux-pro-max + security-review skills (codebase reasoning, not just pattern match)

---

## Findings summary

| Severity | Count |
|---|---|
| 🔴 CRITICAL | 1 |
| 🟠 HIGH | 4 |
| 🟡 MEDIUM | 5 |
| 🔵 LOW | 5 |
| ⚪ INFO | 2 |

**"Review each patch before applying. Nothing has been auto-applied."**

---

## Dependency audit

`package.json` versions read. No known-CVE pins flagged at this snapshot:

| Package | Version | Status |
|---|---|---|
| `next` | 16.2.1 | OK |
| `next-auth` | ^4.24.13 | OK (latest v4) |
| `prisma` / `@prisma/client` | ^7.6.0 | OK |
| `bcryptjs` | ^3.0.3 | OK |
| `nodemailer` | ^7.0.13 | OK |
| `ioredis` | ^5.10.1 | OK |
| `minio` | ^8.0.7 | OK |
| `puppeteer` | ^24.40.0 | OK |
| `pg` | ^8.20.0 | OK |
| `@react-pdf/renderer` | ^4.3.2 | OK (unused at runtime, candidate for removal) |
| `@tiptap/*` | ^3.22.0 | OK |
| `zod` | ^4.3.6 | OK |

**Observation:** the project keeps both `puppeteer` and `@react-pdf/renderer`. Only `puppeteer` is wired in routes; `@react-pdf/renderer` increases the attack surface and bundle size with no consumers — recommended for removal (INFO).

---

## CRITICAL

### C-1 — Predictable `NEXTAUTH_SECRET` deployed in production
- **File:** EasyPanel env (verified via screenshot earlier in session)
  `NEXTAUTH_SECRET=olive-labs-secret-key-production-2024`
- **Impact:** the JWT session secret is a guessable string built from project name + year. Any attacker who guesses or finds it (it appears in error pages, in stack traces, or via environment leaks) can forge `next-auth` session JWTs and impersonate **any user, including super-admins**, completely bypassing authentication.
- **Confidence:** High. The exact value was visible in the EasyPanel environment editor in this session.
- **Patch:** rotate the secret to a 32-byte random value:
  ```bash
  # On the VPS
  openssl rand -base64 48
  ```
  Replace `NEXTAUTH_SECRET` in EasyPanel → ol-app → Ambiente; redeploy. **All current sessions will be invalidated** (intended).
- **Hardening:** add a runtime guard so the app refuses to boot with the leaked default:
  ```ts
  // src/lib/auth.ts (new check at module top)
  if (process.env.NODE_ENV === "production") {
    const s = process.env.NEXTAUTH_SECRET ?? "";
    if (!s || s.length < 32 || /olive-labs-secret-key-production-2024/i.test(s)) {
      throw new Error(
        "NEXTAUTH_SECRET must be a >=32-char random value in production"
      );
    }
  }
  ```

---

## HIGH

### H-1 — Default seed admin credentials hardcoded in repo
- **File:** `prisma/seed.ts` lines 83 & 86
  ```ts
  const admin = await upsertUser("admin@ello.com.br", "Admin ELLO", "admin123", true);
  const oliveAdmin = await upsertUser("admin@olivelabs.com", "Admin Olive Labs", "olive@2024", true);
  ```
- **Impact:** the seed runs on every fresh deploy via `docker-entrypoint.sh`. If those passwords are not changed immediately after the first login, **anyone reading the public GitHub repo can log in as super-admin**. The `PRODUCTION_READINESS_PLAN.md` already mentions this as a known issue but it has not been fixed.
- **Confidence:** High. Repo is public.
- **Patch:** require seed credentials from env vars; fail loudly if absent:
  ```ts
  // prisma/seed.ts
  const adminPw  = process.env.SEED_ADMIN_ELLO_PASSWORD;
  const olivePw  = process.env.SEED_ADMIN_OLIVE_PASSWORD;
  if (!adminPw || !olivePw) {
    throw new Error("Set SEED_ADMIN_*_PASSWORD env vars before running the seed");
  }
  await upsertUser("admin@ello.com.br",   "Admin ELLO",       adminPw, true);
  await upsertUser("admin@olivelabs.com", "Admin Olive Labs", olivePw, true);
  ```

### H-2 — MinIO using documented default credentials
- **File:** EasyPanel ol-app env (verified in screenshot)
  `MINIO_ACCESS_KEY=minioadmin` / `MINIO_SECRET_KEY=minioadmin123`
- **Impact:** `minioadmin/minioadmin` is the documented MinIO bootstrap default. If MinIO's port (9000/9001) is reachable from outside the EasyPanel network, an attacker with the default creds can read every uploaded asset (logos, attachments, proposal PDFs) and overwrite/delete buckets.
- **Confidence:** High.
- **Patch:** rotate at the MinIO service (EasyPanel → ol-minio → Ambiente):
  ```
  MINIO_ROOT_USER=<32 random hex>
  MINIO_ROOT_PASSWORD=<48 random hex>
  ```
  Then mirror the new values into ol-app's `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` and redeploy. Confirm MinIO console (port 9001) is **not** exposed publicly via EasyPanel domain mapping.

### H-3 — Plaintext password emailed during admin user creation
- **File:** `src/app/api/admin/usuarios/route.ts` and `src/app/api/admin/organizacoes/[id]/usuarios/route.ts` (the `sendInvite` branch in both)
  ```ts
  // Suas credenciais:
  // E-mail: ${email}
  // Senha temporária: ${password}
  ```
- **Impact:** the cleartext password is sent over SMTP and persists in the recipient's mailbox indefinitely, in their email provider's backups, and in any forwarded copy. Anyone who later compromises the inbox or mail relay gets the password — and because most users keep this password, the leak is permanent.
- **Confidence:** High.
- **Patch:** replace the plaintext credential with a single-use "set your password" link (the password-reset flow already exists):
  ```ts
  // After creating the user, mint a reset token and email the link instead.
  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 7*24*3600*1000) },
  });
  const setupUrl = `${appBaseUrl()}/redefinir-senha?token=${raw}`;
  // ...email body shows setupUrl, NOT the password.
  ```
  Server can still create the account with a random throwaway password (never sent anywhere) so the user is forced through the reset flow on first access.

### H-4 — HTML injection in transactional emails
- **Files:**
  - `src/lib/mailer.ts` → `renderBrandedEmail(title, bodyHtml)` interpolates `bodyHtml` raw.
  - Callers that pass user-controlled strings into the `bodyHtml` template **without escaping**:
    - `src/app/api/propostas/[id]/send/route.ts` — interpolates `proposal.projectName`, `proposal.clientName`, `message` directly into the HTML string.
    - `src/app/api/admin/usuarios/route.ts` and `.../organizacoes/[id]/usuarios/route.ts` — interpolates `name`, `email`, `org.name` raw.
    - `src/app/api/auth/reset-request/route.ts` — interpolates `user.name` raw.
- **Impact:** any field a tenant member controls (project name, client name, custom message, even their own display name) becomes **HTML in someone else's inbox**. Attack vectors:
  1. Phishing: an attacker registers `clientName = "<a href='https://evil.tld'>Click to view proposal</a>"` and the malicious link renders inside the legitimate Olive Labs–branded email.
  2. CSS injection / image trackers via `<img src=...>` injected into the body.
  3. Some email clients still execute limited script (Outlook, certain webmails); risk is provider-dependent but exists.
- **Confidence:** High for HTML injection / phishing, Low–Medium for direct script execution.
- **Patch:** add an `escapeHtml` helper to `lib/mailer.ts` and use it on every dynamic field that lands in a `<p>`, `<li>`, `<strong>` etc:
  ```ts
  // src/lib/mailer.ts
  export function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  ```
  Then in callers:
  ```ts
  // src/app/api/propostas/[id]/send/route.ts
  const html = renderBrandedEmail(`Proposta ${escapeHtml(proposal.number)}`, `
    <p>Olá,</p>
    ${message ? `<p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>` : ""}
    <p>Preparamos a proposta <strong>${escapeHtml(proposal.projectName)}</strong>
       para <strong>${escapeHtml(proposal.clientName)}</strong>.</p>
    ...
  `);
  ```
  Apply the same wrapping to `name`, `email`, `org.name`, `user.name` in the other two callers.

---

## MEDIUM

### M-1 — SVG accepted by upload endpoint, not sanitized
- **File:** `src/app/api/upload/route.ts` — `IMAGE_SIGNATURES` accepts `image/svg+xml` based on `<?xml`/`<svg` magic bytes.
- **Impact:** SVG can carry inline `<script>` and `<foreignObject>` with HTML/JS. When the uploaded SVG is later served from the same origin and rendered in a browser tab (e.g. a logo loaded as `<img>` is fine, but if it is opened as the page URL or embedded via `<object>/<iframe>`, scripts run with the app's origin → cookie + storage access).
- **Confidence:** Medium. Today the app only consumes uploads via `<img src="...">`, where browsers run SVG without scripts. But the bucket may be exposed publicly via a presigned URL that, when opened directly, *does* execute scripts.
- **Patch (preferred):** drop SVG from the accepted list — proposals don't need vector logos at runtime; PNG/JPG/WEBP cover the use case.
  ```ts
  const IMAGE_SIGNATURES = [
    /* PNG */, /* JPEG */, /* WEBP */, /* GIF */
    // SVG removed: it can carry inline scripts and is XSS-prone.
  ];
  ```
  **Or** strip dangerous nodes server-side using `dompurify` with `USE_PROFILES: { svg: true, svgFilters: true }` and re-serialize before storing.

### M-2 — Block-editor delete modal renders user content via `dangerouslySetInnerHTML`
- **File:** `src/components/proposals/block-editor.tsx` ~line 707
  ```tsx
  <div dangerouslySetInnerHTML={{ __html: deleteTarget.content.slice(0, 300) }} />
  ```
- **Impact:** Tiptap normally produces sanitized HTML, but `block.content` is **stored as raw HTML** in Prisma's `Proposal.contentBlocks` JSON field. A super-admin or anyone with org-write access could set a `content` value that includes `<img src=x onerror=alert(1)>`. When another user (admin previewing before delete) views the modal, the script fires in their session — privilege escalation across users in the same tenant.
- **Confidence:** Medium (Tiptap sanitizes during edit, but server doesn't re-validate).
- **Patch:** strip HTML before rendering the preview:
  ```tsx
  function htmlToPlain(html: string): string {
    return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  }
  // ...
  <p className="text-xs text-[#8B8F96]">
    {htmlToPlain(deleteTarget.content).slice(0, 300)}
  </p>
  ```
  Server-side, sanitize on save with `dompurify` (jsdom) inside the proposal POST/PUT routes for every text-block `content` field.

### M-3 — No `Content-Security-Policy` header
- **File:** `next.config.ts` — sets `X-Frame-Options`, `HSTS`, `nosniff`, `Permissions-Policy`, but no CSP.
- **Impact:** any successful HTML/script injection (e.g. via M-1 or M-2 above) executes with full origin privileges. CSP `script-src 'self'` is the cheapest mitigation.
- **Confidence:** High (header genuinely absent).
- **Patch:**
  ```ts
  // next.config.ts — securityHeaders
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",   // Next.js + Tiptap need inline
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  ```

### M-4 — `MIN_PASSWORD = 8` allows breached/common passwords
- **File:** `src/lib/password.ts`
- **Impact:** the policy accepts `password1`, `qwerty12`, etc. With login rate-limit at 5 attempts / 5 min, brute force is slow but credential stuffing still works because no breach-list check.
- **Patch:** integrate `zxcvbn` or check the password against a hashed copy of the Have-I-Been-Pwned k-anonymity API. As a quick win, deny the top-100 common passwords list locally.

### M-5 — Cron secret compared with non-constant-time `===`
- **File:** `src/app/api/cron/expire-proposals/route.ts`
  `if (!expected || auth !== \`Bearer ${expected}\`) { return errorResponse("Unauthorized", 401); }`
- **Impact:** Theoretically a remote-timing oracle leaks the secret byte-by-byte. With network jitter the practical exploit on internet-facing endpoints is extremely hard, but it is a known anti-pattern.
- **Patch:**
  ```ts
  import { timingSafeEqual } from "node:crypto";
  const provided = (auth || "").replace(/^Bearer\s+/, "");
  const ok = expected.length === provided.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  if (!ok) return errorResponse("Unauthorized", 401);
  ```

---

## LOW

| ID | Finding | File / Note |
|---|---|---|
| L-1 | bcrypt cost factor inconsistent (10 in `reset-confirm` and `admin/organizacoes/[id]/usuarios`; 12 elsewhere). Standardize on **12** in 2026. | `src/app/api/auth/reset-confirm/route.ts:43`, `.../organizacoes/[id]/usuarios/route.ts:78` |
| L-2 | `migrate.ts` logs the full error object in `console.error("Migration failed:", err)`. Postgres errors include the connection string in some drivers. Replace with `(err as Error).message`. | `prisma/migrate.ts` |
| L-3 | `/api/health` is unauthenticated and discloses service status. Useful for monitoring; OK to keep but rate-limit and avoid returning stack details. | `src/app/api/health/route.ts` |
| L-4 | Cookie `sameSite` defaults to NextAuth's `lax`; for state-changing POSTs to `/api/propostas`, `/api/clientes`, etc., `lax` mitigates classic CSRF for top-level navigation only. Consider `strict` if no cross-site flow is needed. | `src/lib/auth.ts` (no explicit cookie config) |
| L-5 | DataTable still uses `any` for column accessor — not a security issue but reduces type safety for callers (could mask `__proto__` access in untrusted data). | `src/components/ui/data-table.tsx` |

## INFO

| ID | Finding |
|---|---|
| I-1 | `@react-pdf/renderer` declared but never imported. Removing it shrinks the dependency surface (~40 MB of native deps). |
| I-2 | No CSRF token on form-style POSTs; relies on same-origin + lax cookie. Acceptable for a same-origin SPA but document the assumption. |

---

## Cross-file data-flow notes (post-mortem reasoning)

- **User input → SQL:** All user-controlled DB queries go through Prisma's parameterized API. Searches use `contains: { mode: "insensitive" }` which is properly escaped. ✅
- **User input → process exec:** None. No `child_process.exec`, no `eval`, no `new Function()`. ✅
- **User input → HTML:** Three paths reach raw HTML:
  1. Email bodies (H-4) — fix.
  2. Block delete preview (M-2) — fix.
  3. A4 preview iframe — uses `escapeHtml` on every interpolated user field; OK ✅.
- **User input → file system:** Uploads write to MinIO under `${orgId}/${prefix}/${sanitizedName}`. Sanitization regex prevents directory traversal. ✅
- **User input → SSRF:** None. The cron and email endpoints don't take user-controlled URLs. ✅
- **Authentication:** `src/middleware.ts` blocks unauthenticated access to `/dashboard/*`, `/admin/*`, `/api/*` (except whitelisted public routes). ✅ Super-admin gate is enforced both in middleware and in `/api/admin/*` route handlers. ✅

---

## Recommended remediation order

1. **Immediately (today):** rotate `NEXTAUTH_SECRET` (C-1), rotate MinIO root creds (H-2), change the seeded admin passwords on the live DB.
2. **This sprint:** ship patches for H-3 (invite-link instead of plaintext), H-4 (escapeHtml in mailer), M-1 (drop SVG from upload), M-2 (plaintext delete preview), M-3 (CSP header).
3. **Next sprint:** standardize bcrypt cost (L-1), add timingSafeEqual on cron (M-5), `zxcvbn` on password policy (M-4), clean up unused dependency (I-1).

---

**Status:** patches above are illustrative — none has been applied. Review and merge selectively.
