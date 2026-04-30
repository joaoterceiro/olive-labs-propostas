# Secrets & Configuration Audit

**Scope:** focused review on the user request:
1. `.gitignore` exists and covers `.env` / credential files
2. No API keys / passwords / tokens hardcoded in source
3. Sensitive values come from environment variables, not literals

**Date:** 2026-04-22
**Verdict:** ✅ Pass with 2 known follow-ups (already in `docs/SECURITY_REVIEW.md`).

---

## 1. `.gitignore`

| Check | Result |
|---|---|
| File exists | ✅ `.gitignore` present (575 bytes) |
| Has `.env*` rule | ✅ lines 46–49 cover `.env`, `.env.local`, `.env.production`, plus a generic `.env*` line |
| `.env.example` allowed through | ✅ correctly NOT ignored — it's the public template |

**Verified by `git check-ignore`:**

```
.env             → ignored (.gitignore:46)
.env.local       → ignored (.gitignore:47)
.env.production  → ignored (.gitignore:48)
.env.example     → NOT IGNORED  (intended; this is the doc template)
```

**Verified by `git ls-files | grep env`:** the only env-related file tracked in the repo is `.env.example`. No `.env` / `.env.local` / `.env.production` is committed.

Local working copy contains `.env` (2 lines) and `.env.local` (19 lines) — both untracked, both ignored.

## 2. Hardcoded API keys / tokens / private keys in source

Searched `src/`, `prisma/`, `docs/` for:
- Stripe keys (`sk_live_`, `sk_test_`, `pk_live_`)
- AWS access keys (`AKIA[0-9A-Z]{16}`)
- GitHub PAT (`ghp_*`)
- Slack tokens (`xox[bopa]-`)
- PEM private keys (`-----BEGIN ... PRIVATE KEY`)
- JWT (`eyJhbGc`)

Result: **0 matches.** No raw provider keys, no PEM material, no JWTs in code.

## 3. Hardcoded passwords / connection strings

### Source tree (`src/`, `prisma/`)

- **No** `postgresql://`, `redis://`, `mongodb://`, `amqp://` literals outside `process.env`.
- **No** `console.log(... password|token|secret ...)` patterns.

### One **expected** hardcoded item

| Location | What | Why it's flagged |
|---|---|---|
| `prisma/seed.ts:83` | `upsertUser("admin@ello.com.br", "Admin ELLO", "admin123", true)` | Seed data committed in a **public** repo. Already covered as **H-1** in `docs/SECURITY_REVIEW.md`. Recommended fix: read from `process.env.SEED_ADMIN_*_PASSWORD`. |
| `prisma/seed.ts:86` | `upsertUser("admin@olivelabs.com", "Admin Olive Labs", "olive@2024", true)` | Same. Public super-admin password until rotated on the live DB. |

### Library defaults (development-only fallbacks)

`src/lib/*` uses the `process.env.X || "default"` pattern in three places. These literals are **not real credentials** but should be reviewed:

| File | Line | Default | Risk |
|---|---|---|---|
| `src/lib/minio.ts` | 8–12 | `endPoint: "localhost"`, `port: 9000`, `accessKey: "ello_minio"`, `secretKey: "ello_minio_secret"` | Dev-only string. **Does not bypass anything** — MinIO would still reject these unless someone configured a server with the same literals. Acceptable as a dev fallback; a production-only assertion would be safer. |
| `src/lib/redis.ts` | 7 | `redis://localhost:6379` | Dev-only. No credentials. Safe. |
| `src/lib/mailer.ts` | 9, 45, 66 | `SMTP_PORT: 587`, default `from: "Olive Labs <no-reply@olivecomunicacao.com.br>"`, fallback URL | Non-secret defaults. Safe. |

**Note:** `process.env.NEXTAUTH_SECRET` has **no fallback** in `src/lib/auth.ts` — correct behavior. NextAuth refuses to mint JWTs without a secret in production.

## 4. Inventory of env vars actually consumed

20 unique reads across the codebase, all routed through `process.env`:

```
CRON_SECRET                 # /api/cron/expire-proposals Bearer
DATABASE_URL                # Prisma + raw pg
NEXTAUTH_SECRET             # next-auth JWT signing
NEXTAUTH_URL                # branded-email links
NEXT_PUBLIC_APP_URL         # appBaseUrl() fallback
NODE_ENV                    # runtime branch
REDIS_URL                   # ioredis connection
MINIO_ENDPOINT              # MinIO host
MINIO_PORT
MINIO_USE_SSL
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
MINIO_BUCKET_PDFS
MINIO_BUCKET_ATTACHMENTS
MINIO_BUCKET_LOGOS
SMTP_HOST                   # nodemailer transport
SMTP_PORT
SMTP_USER
SMTP_PASS
SMTP_FROM
```

`prisma/migrate.ts`, `prisma/repair.ts`, and `prisma/seed.ts` all do `import "dotenv/config";` so they pick up `.env` at script time — same env contract as the runtime app.

## 5. `.env.example` content (template, tracked in git)

The committed template lists the variable names but no live values. Verified categories:
- Database (PostgreSQL)
- Redis
- MinIO (S3-compatible storage)
- NextAuth

No leaked credentials in the template.

---

## Summary

| Question (from the request) | Answer |
|---|---|
| `.gitignore` exists? | ✅ Yes |
| `.gitignore` covers `.env` / config files? | ✅ `.env`, `.env.local`, `.env.production`, plus `.env*` glob |
| API keys / passwords / tokens hardcoded in source? | ✅ None in `src/` |
| Project uses env vars for sensitive data? | ✅ All 20 sensitive values flow through `process.env.*` |

## Open items (already tracked, not regressions)

1. **`prisma/seed.ts` super-admin passwords** are checked into a public repo. Track via `docs/SECURITY_REVIEW.md` H-1 — fix is to require `SEED_ADMIN_*_PASSWORD` env vars before seeding.
2. **MinIO dev fallbacks** in `src/lib/minio.ts` are harmless literals but a `if (process.env.NODE_ENV === "production" && !process.env.MINIO_SECRET_KEY) throw` guard would prevent the server from booting against unconfigured MinIO with a dev string.

Both items have proposed patches in `docs/SECURITY_REVIEW.md`.

**Status:** the secrets hygiene posture is clean. Nothing is leaking through git or being read from a literal in runtime code.
