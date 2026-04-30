# SQL Injection / XSS / CSRF — focused review

**Scope:** every DB call, every place user-generated content lands in HTML,
and every state-changing HTTP verb.
**Date:** 2026-04-22
**Verdict:**

| Vector | Status |
|---|---|
| 🟢 SQL Injection | **Safe.** Prisma ORM everywhere; the few raw `pg` callsites use parameterized queries; no string-interpolated SQL touches user input. |
| 🟡 XSS | **2 known holes** — delete-modal preview renders raw Tiptap HTML; transactional emails interpolate user fields without escaping. |
| 🟡 CSRF | **Partially mitigated.** SameSite=Lax (NextAuth default) + same-origin SPA covers most cases. No CSRF tokens / Origin check on the custom JSON endpoints. |

---

## 1. SQL injection — clean

### 1a. Prisma client (the 99% case)
Every route handler in `src/app/api/**` queries the DB through the
generated Prisma client (`prisma.proposal.*`, `prisma.user.*`, etc).
Prisma always parameterizes; the audit found **zero** uses of
`Prisma.sql` template tag or `$queryRawUnsafe` — the two ways a developer
could opt out of parameterization.

### 1b. Raw `pg` (the 1% case)
Three scripts use the `pg` driver directly:

| File | What | Safety |
|---|---|---|
| `prisma/seed.ts` | `pool.query("INSERT ... VALUES ($1, $2, ...)", [...])` | ✅ parameterized |
| `prisma/migrate.ts` | reads SQL from `prisma/migrations/*/migration.sql` (own files) and runs as-is. No user input ever reaches it. | ✅ trusted source |
| `prisma/repair.ts` | constant array of `IF NOT EXISTS` statements. No interpolation. | ✅ static |

### 1c. The single `$queryRaw` callsite
`src/app/api/health/route.ts:9` uses `prisma.$queryRaw\`SELECT 1\`` — a
bare health probe with no inputs. Safe.

**No SQL injection findings.**

---

## 2. XSS

### 2a. React JSX baseline ✅
React auto-escapes any `{userValue}` inside JSX. The audit confirmed
`innerHTML`, `outerHTML`, `insertAdjacentHTML`, and `document.write` are
**never used** in the codebase. The only escape hatch in use is
`dangerouslySetInnerHTML`, with **3** total occurrences.

### 2b. `dangerouslySetInnerHTML` review

| File | Content type | Verdict |
|---|---|---|
| `src/app/(auth)/layout.tsx:178` | Static CSS template literal (animations, keyframes, layout). No interpolation. | ✅ Safe |
| `src/app/(auth)/login/page.tsx:496` | Same — static `<style>` tag with hand-written CSS. | ✅ Safe |
| `src/components/proposals/block-editor.tsx:707` | **Renders `deleteTarget.content`** — the user's own Tiptap HTML, sliced to 300 chars. | 🟡 **Finding X1** |

#### X1 — Block-editor delete-modal preview renders raw Tiptap HTML
- **File:** `src/components/proposals/block-editor.tsx:707`
- **Today:**
  ```tsx
  <div
    className="..."
    dangerouslySetInnerHTML={{ __html: deleteTarget.content.slice(0, 300) }}
  />
  ```
  Tiptap normally produces sanitized HTML during edit, but `block.content`
  is **stored verbatim** in `Proposal.contentBlocks` JSON. A super-admin
  with API access (or anyone who can write directly to the DB) could
  inject `<img src=x onerror=...>`. When another org admin opens the
  delete modal, the script fires in their session.
- **Confidence:** Medium. Local exploitability requires write access to
  proposal blocks; multi-tenant write-paths already validate against
  Tiptap's clean output. But there is **no server-side sanitization**
  on save.
- **Fix:**
  ```tsx
  function htmlToPlain(html: string): string {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  // ...
  <p className="...">{htmlToPlain(deleteTarget.content).slice(0, 300)}</p>
  ```
  Plus, sanitize on save: in `POST/PUT /api/propostas` use `dompurify`
  (jsdom flavor) to strip script/onerror/etc on every text-block before
  persisting.

### 2c. Email templates (server → SMTP → mail clients)

The PDF route (`/api/propostas/[id]/pdf`) **already escapes** every
dynamic field via its local `escapeHtml()` (lines 14–22). 30+ correct
uses across the file. ✅

The mailer (`src/lib/mailer.ts:72`) **does NOT escape**. It exports
`renderBrandedEmail(title, bodyHtml)` which interpolates `bodyHtml`
verbatim into the template. Four callers compose `bodyHtml` themselves
with template literals:

| Caller | Fields interpolated raw |
|---|---|
| `src/app/api/propostas/[id]/send/route.ts:59` | `proposal.projectName`, `proposal.clientName`, `message`, `proposal.organization.name` |
| `src/app/api/admin/usuarios/route.ts:103` | `name`, `email`, `password`, `org.name` |
| `src/app/api/admin/organizacoes/[id]/usuarios/route.ts:112` | `name`, `email`, `password`, `org.name` |
| `src/app/api/auth/reset-request/route.ts:49` | `user.name` |

#### X2 — HTML injection in transactional emails
- **Today:** all four callers concatenate user-controlled strings into the
  `bodyHtml` string with no escaping.
- **Risk:** an attacker who controls `clientName` (e.g.
  `<a href="https://evil.tld">Click to view proposal</a>`) sees the
  malicious link rendered inside the legitimate Olive Labs–branded email
  delivered to a third party. Phishing under our domain. Some webmail
  clients still execute limited JS.
- **Confidence:** High for HTML injection / phishing.
- **Fix (single point of repair):**

  ```ts
  // src/lib/mailer.ts — export this and import in all 4 callers
  export function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  ```

  Then in every caller, wrap each interpolation:
  ```ts
  // Before:
  <strong>${proposal.projectName}</strong>
  // After:
  <strong>${escapeHtml(proposal.projectName)}</strong>
  ```

  The PDF route's local `escapeHtml` should also move into a shared
  `lib/escape.ts` so we have one implementation site-wide.

---

## 3. CSRF

### 3a. Threat model

Olive Labs is a same-origin SPA: the browser holds a `next-auth.session-token`
**HTTP-only** cookie issued by `/api/auth/*`. JavaScript on the page sends
JSON to `/api/*` with `credentials: include`. There is no third-party
embed. The realistic CSRF surface is:

1. A user is logged in to `app.olivecomunicacao.com.br`.
2. They visit `evil.tld` in another tab.
3. `evil.tld` triggers a request to `https://app.olivecomunicacao.com.br/api/propostas/{id}` with method=DELETE / POST.

### 3b. Existing mitigations

- **NextAuth built-in CSRF:** the `/api/auth/signin` and `/api/auth/signout`
  flows enforce a `next-auth.csrf-token` double-submit cookie. ✅ but
  scope is limited to NextAuth's own routes.
- **SameSite cookies:** NextAuth's default is `sameSite: "lax"` — modern
  browsers refuse to send the session cookie on `<form>` POST, `<img>`,
  `<iframe>` etc. that originate cross-site. Cross-site `fetch()` with
  credentials is also blocked. This **prevents the most common CSRF
  vectors** on its own.
- **`Content-Type: application/json` on the JSON endpoints:** the
  client never accepts simple-form CORS, so a cross-origin
  `<form action=...>` cannot trigger a JSON POST.
- **Custom security headers** in `next.config.ts`: `X-Frame-Options DENY`,
  `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`. ✅

### 3c. Gaps

#### Y1 — `sameSite` is implicit, not explicit
- **File:** `src/lib/auth.ts`
- **Today:** no `cookies` block in `authOptions`, so the value is whatever
  NextAuth's default decides. As of next-auth v4 it's `"lax"`, but a
  future major-bump could change the default.
- **Fix:** pin it.
  ```ts
  // src/lib/auth.ts — inside authOptions
  cookies: {
    sessionToken: {
      name: "__Secure-next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "strict",  // was implicit "lax"
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  ```
  `strict` is safe because the SPA is fully same-origin (no OAuth
  redirect flows to absorb a SameSite=Lax round-trip). Tighter bound.

#### Y2 — No Origin/Referer check on state-changing endpoints
- **File:** all `POST/PUT/DELETE` route handlers in `src/app/api/**`
- **Today:** the handlers trust the cookie-driven session. No verification
  that the request originated from a same-origin page.
- **Risk:** if SameSite ever loosens (browser regression, third-party
  cookie policy change, malicious browser extension), CSRF re-opens.
  Defense-in-depth wants a second check.
- **Fix:** wrap state-changing handlers with a tiny middleware that asserts
  the `Origin` header matches `NEXTAUTH_URL`.

  ```ts
  // src/lib/origin-guard.ts
  export function originAllowed(req: Request): boolean {
    const expected = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
    if (!expected) return true; // dev / not configured
    const origin = req.headers.get("origin");
    if (origin) return origin.replace(/\/$/, "") === expected;
    // Fall back to Referer when Origin is absent (older browsers, some
    // server-to-server flows).
    const referer = req.headers.get("referer") || "";
    return referer.startsWith(expected + "/");
  }
  ```
  And in `src/middleware.ts`, gate non-GET non-public requests:
  ```ts
  if (
    req.method !== "GET" &&
    req.method !== "HEAD" &&
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth/") &&
    !pathname.startsWith("/api/cron/") &&
    !pathname.startsWith("/api/health")
  ) {
    if (!originAllowed(req)) {
      return NextResponse.json({ error: "Bad origin" }, { status: 403 });
    }
  }
  ```
  Cron is excluded because it's called server-to-server with a Bearer
  token (no Origin). Auth and health are cross-flows.

#### Y3 — Use POST not GET for any state mutation
Already true everywhere — verified by scan. ✅ no GET handlers do
mutations.

---

## Suggested patch order

1. **X2** (mailer escape) — biggest exposure surface (any auth'd member
   can phish via emails). 4 files + 1 helper. ~15 min.
2. **X1** (block-editor delete preview) — narrow but real. 5 lines.
3. **Y1** (explicit `sameSite: "strict"`) — 4-line auth config tweak.
4. **Y2** (origin guard middleware) — 1 helper + 6 lines in middleware.
   Adds a defense layer at the edge.

None blocks deploy. All four together close every realistic injection /
XSS / CSRF vector in the app.
