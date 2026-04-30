# Input Validation Audit

**Scope:** every API route handler and library helper that accepts user input.
**Stack:** Next.js 16 route handlers + Zod 4 + Prisma 7 + raw `pg` for migrations.
**Date:** 2026-04-22
**Verdict:** Mostly solid. **6 routes have soft spots** — none is a critical
hole, but 3 deserve hardening before scale.

---

## Coverage map (26 route files)

| Severity | Count | Examples |
|---|---|---|
| ✅ Strong (zod with `min`/`max`/format + auth) | 16 | `propostas/route.ts`, `clientes/route.ts`, `servicos/route.ts`, `auth/reset-confirm`, `auth/reset-request`, `propostas/[id]/send`, `propostas/[id]/route.ts` PUT, `perfil/senha` |
| 🟡 Validates the body but missing length caps | 4 | `admin/organizacoes/route.ts`, `admin/organizacoes/[id]/route.ts`, `admin/usuarios/[id]/route.ts`, `perfil/route.ts` |
| 🟠 No body validation (gap) | 3 | `pdf/route.ts`, `search/route.ts` (uses `searchParams`), `upload/route.ts` (validates the file but not other fields) |
| ➖ No body — read-only or path-only | 3 | `health`, `cron/expire-proposals`, `auth/[...nextauth]` |

---

## 🟠 Findings

### F1 — `/api/pdf` accepts arbitrary HTML with no length limit
- **File:** `src/app/api/pdf/route.ts`
- **Today:** receives `body.html` and pipes it straight into Puppeteer's
  `page.setContent`. Authenticated by `requireSession()` so only org members
  can hit it, but **any string is accepted** including 50 MB blobs.
- **Risk:** memory/CPU exhaustion (DoS), fork bombs of headless Chrome,
  recursive `<iframe srcdoc=...>` payloads. Self-XSS still possible inside
  the headless browser (already documented).
- **Fix:** wrap in zod with explicit caps:
  ```ts
  const schema = z.object({
    html: z.string().min(1).max(2_000_000), // ~2 MB cap
    filename: z.string().regex(/^[\w.-]{1,200}$/).optional(),
  });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return errorResponse("Dados invalidos", 422);
  ```
  Plus: add a request timeout (`page.setDefaultTimeout(30_000)`) to bound
  Puppeteer execution per call.

### F2 — `/api/search` ignores the explicit length cap and never sanitizes the term
- **File:** `src/app/api/search/route.ts`
- **Today:** reads `q` from `searchParams`, only checks `q.length < 2` early
  return. Passes the raw string to Prisma's `contains: { mode: "insensitive" }`.
- **Risk:** Prisma escapes correctly (no SQLi), but a 100 KB `q` opens a
  CPU-bound regex on every column scanned in 3 tables. Empty filtering
  on long strings = cheap DoS.
- **Fix:** zod even for query params:
  ```ts
  const QSchema = z.object({
    q: z.string().min(2).max(120),
    limit: z.coerce.number().int().min(1).max(20).optional().default(5),
  });
  const parsed = QSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return Response.json({ proposals: [], clients: [], services: [] });
  // use parsed.data.q
  ```

### F3 — `/api/upload` validates the file magic bytes but not `bucket` / `prefix` length
- **File:** `src/app/api/upload/route.ts`
- **Today:**
  - file size ≤ 10 MB ✅
  - MIME magic-byte sniff (PNG/JPG/WEBP/GIF/SVG) ✅
  - `bucket` is whitelisted ✅
  - `prefix` already has a regex sanitizer `replace(/[^a-zA-Z0-9_-]/g, "")` ✅
  - **but** no length cap on `prefix` → 1 MB string of `_` allowed, becomes
    a 1 MB MinIO object key → MinIO will reject above 1024 chars but the
    server still allocates it.
- **Fix:** cap `prefix` at 64 chars before the regex replace:
  ```ts
  const prefixStr = (prefix && typeof prefix === "string"
    ? prefix.slice(0, 64).replace(/[^a-zA-Z0-9_-]/g, "")
    : "");
  ```
  Same for `file.name` — regex strips bad chars but doesn't cap the length.
  Add `.slice(0, 200)` after the sanitization.

---

## 🟡 Soft spots (validates, missing caps or coercion)

### F4 — `/api/admin/organizacoes` (POST + PUT)
- Validates `name`, `slug`, etc. via inline checks and Prisma's unique
  constraints, **but no `z.object` schema**, no max-length per field.
  - `name`, `slug`, `email`, `phone`, `cnpj`, `address`, `city`, `state`,
    `website`, `primaryColor`, `defaultHeaderImage`, `defaultFooterImage`
    are all optional strings — currently typed as `unknown` and pushed
    straight to `prisma.organization.create({ data })`. A 1 MB `name`
    explodes the row.
- **Fix:** add a zod schema mirroring the schema lengths:
  ```ts
  const orgSchema = z.object({
    name: z.string().min(1).max(120),
    slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
    email: z.string().email().max(180).nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    cnpj: z.string().max(20).nullable().optional(),
    address: z.string().max(240).nullable().optional(),
    city: z.string().max(80).nullable().optional(),
    state: z.string().max(2).nullable().optional(),
    website: z.string().url().max(200).nullable().optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
    defaultHeaderImage: z.string().max(500).nullable().optional(),
    defaultFooterImage: z.string().max(500).nullable().optional(),
  });
  ```

### F5 — `/api/admin/usuarios/[id]` (PATCH)
- Updates a user record with an arbitrary partial body. Today verifies
  `requireSuperAdmin()` and just calls `prisma.user.update({ data: body })`
  — that's a **mass-assignment** risk: an admin payload could include
  `passwordHash`, `isSuperAdmin`, `createdAt`, etc. and Prisma will accept
  whatever it recognizes.
- **Fix:** explicit allow-list:
  ```ts
  const updateSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().max(180).optional(),
    phone: z.string().max(40).nullable().optional(),
    isActive: z.boolean().optional(),
    isSuperAdmin: z.boolean().optional(), // gated by requireSuperAdmin already
  });
  ```

### F6 — `/api/perfil` (PATCH)
- User updates their own profile. The currently-accepted shape is loose;
  attacker can post `email: "another@target"` and overwrite a teammate's
  email if Prisma's `unique` constraint isn't hit (rare race) → support
  hijack via password reset.
- **Fix:** zod schema scoped to safe fields, plus an "email change requires
  re-auth" rule (out of scope for this audit; flag as separate item):
  ```ts
  const profileSchema = z.object({
    name: z.string().min(1).max(120).optional(),
    phone: z.string().max(40).nullable().optional(),
    avatarUrl: z.string().url().max(500).nullable().optional(),
    // email change disabled here; require dedicated /api/perfil/email flow
  });
  ```

---

## ✅ Strong validators (already in place)

| Route | Validation highlights |
|---|---|
| `POST /api/propostas` | zod schema with `companyName/clientName/projectName.max(240)`, `hours ≤ 10000`, `hourlyRate ≤ 999999`, items array `min(1)`, deliverables strings `max(240)`. Atomic `number` retry on P2002 |
| `PUT /api/propostas/[id]` | same itemSchema with id allowed; diff-based update preserves IDs |
| `POST /api/propostas/[id]/send` | zod `to: email`, `subject ≤ 240`, `message ≤ 4000`; rate-limit 20/h |
| `POST /api/auth/reset-request` | zod email; rate-limit 5/10min; non-enumerable response |
| `POST /api/auth/reset-confirm` | zod token min(32) + passwordSchema; FK + expiry + usedAt checks |
| `PUT /api/perfil/senha` | currentPassword + passwordSchema (min 8, letters+numbers); compare before write |
| `POST /api/clientes` + `PUT /api/clientes/[id]` | zod (`companyName.min(1).max(120)`, email/cnpj optional) |
| `POST /api/servicos` + `PUT /api/servicos/[id]` | zod (`name 1..120`, `description ≤ 500`, deliverables string array `max(120)`) |
| `POST /api/upload` | size cap, magic-byte MIME sniff, bucket whitelist |
| `POST /api/cron/expire-proposals` | Bearer token (timing-safe ready, see SECURITY_REVIEW M-5) |
| `POST /api/admin/organizacoes/[id]/usuarios` | zod with passwordSchema |
| `POST /api/admin/usuarios` | zod with passwordSchema, sendInvite flag |
| `PUT /api/configuracoes` | zod, role gate `requireOrgAdmin` |

---

## Implementation pattern (recommended baseline)

For new routes, use this template:

```ts
import { z } from "zod";
import { requireSession, errorResponse } from "@/lib/prisma-tenant";

const Schema = z.object({
  // every string field: min and max
  // every number field: int + min + max
  // every email: z.string().email()
  // every URL: z.string().url()
  // every enum: z.enum([...])
});

export async function POST(request: Request) {
  try { await requireSession(); } catch { return unauthorizedResponse(); }

  let body: unknown;
  try { body = await request.json(); }
  catch { return errorResponse("JSON invalido", 400); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados invalidos", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  // ...use parsed.data only
}
```

---

## Suggested patch order

1. **F1** `/api/pdf` body cap (highest abuse surface)
2. **F2** `/api/search` zod for `q` (CPU DoS)
3. **F5** mass-assignment on admin user update
4. **F4** admin org schema
5. **F3** upload prefix/filename cap
6. **F6** profile self-update schema

Together these would close the remaining gaps. None is exploitable in a
catastrophic way today thanks to the `requireSession`/`requireSuperAdmin`
auth gates and Prisma's parameterization, but each one removes a class
of "unexpected behavior" that a malicious authenticated user could
trigger.
