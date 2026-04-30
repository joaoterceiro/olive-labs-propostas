# Backup, Restore & Disaster Recovery — focused review

**Scope:** Postgres data, MinIO object storage, application config/secrets,
restore procedure, off-site copy, RPO/RTO targets.
**Date:** 2026-04-30
**Verdict:**

| Area | Status |
|---|---|
| 🔴 Postgres backup | **No automation in repo.** Reliance is purely on EasyPanel volume snapshots (host-level, vendor-locked, untested). |
| 🔴 MinIO backup | **No automation.** `miniodata` is a named Docker volume on the same host as the app — single point of failure for every uploaded logo, header, attachment. |
| 🔴 Off-site copy | **None.** All persistent state lives on one EasyPanel host. Host loss = total loss. |
| 🔴 Restore drill | **Never executed.** No documented procedure, no test schedule. |
| 🟡 App config | Secrets in EasyPanel env (good), but no exported snapshot anywhere — re-deploying from scratch needs every env var manually re-entered. |
| 🟡 Code | Git remote on GitHub. ✅ One copy survives host loss, but Docker images are rebuilt from source — fine. |

---

## 1. Current state

### 1a. What exists today

```
┌───────────────────────────────────────────────────┐
│            EasyPanel single host                   │
│                                                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ ol-app  │  │ ol-pg   │  │ ol-minio│            │
│  └─────────┘  └────┬────┘  └────┬────┘            │
│                    │            │                  │
│              ┌─────▼────┐ ┌─────▼─────┐           │
│              │ pgdata   │ │ miniodata │           │
│              │ (volume) │ │ (volume)  │           │
│              └──────────┘ └───────────┘           │
└───────────────────────────────────────────────────┘
                         │
                  Host failure  →  total data loss
```

- `docker-compose.yml` declares two named volumes (`pgdata`, `miniodata`)
  with no backup wiring.
- `docker-entrypoint.sh` runs migrations and seed on boot — those are
  schema operations, not data backups.
- `prisma/repair.ts` is idempotent schema drift recovery, not a data
  recovery tool.
- `/api/cron/expire-proposals` is the only cron endpoint and serves
  business logic (expire SENT proposals after 30 days). It's **not** a
  backup runner.
- No `scripts/` directory. No `pg_dump`, no `mc mirror`, no `restic`,
  no `borg`, no S3 lifecycle policy, no off-site bucket.
- `.env.example` does not declare any backup-related variables.

### 1b. What it means

If the EasyPanel host is lost (hardware failure, account compromise,
provider outage with data loss, ransomware, accidental "Reset Project"
click in the UI):

- **All proposals, clients, services, users, password hashes, content
  blocks, contentBlocks JSON → gone.**
- **All uploaded headers, footers, logos, attachments → gone.**
- **PDF outputs are regenerated on demand from DB + MinIO — but if
  both are gone, no PDF can be reproduced either.**

There is currently no point-in-time we could recover to. The blast
radius is the entire customer-facing dataset.

This was already flagged in `docs/PRODUCTION_READINESS_PLAN.md:86`
("Sem backup automático do Postgres") with a one-line action item.
This audit makes the plan concrete.

---

## 2. Risks

### B1 — Total data loss on host failure (**CRITICAL**)
Single-host hosting + no backup = one bad day from a competitor-killer
event. Cost of recovery: rebuild every customer's proposals from scratch.

### B2 — No point-in-time recovery (**HIGH**)
Even if a snapshot existed, "we restored last Monday's 6 AM image"
loses every change made that week. Scheduled `pg_dump` daily would
cap loss at ≤24 h — still bad, but bounded.

### B3 — Silent corruption blind spot (**HIGH**)
Postgres can develop quiet on-disk corruption (bit rot, fsync issues,
abrupt power loss). Without periodic `pg_dump` + restore drill, the
first time we discover it is when a customer hits a bug. By then the
"backup" volume snapshot may also be corrupt.

### B4 — Ransomware / malicious admin (**MEDIUM**)
If someone gets EasyPanel credentials, both prod data and any
host-co-located snapshots can be wiped in seconds. **Off-site copy with
write-only or append-only credentials is the only mitigation.**

### B5 — Operator error (**MEDIUM**)
A `DELETE FROM proposals WHERE ...` typo, a `DROP TABLE`, an
`UPDATE … SET passwordHash = ''` — undoable only if there's a
backup taken before the typo. Today: there isn't.

### B6 — No restore documentation (**HIGH**)
Even when backups exist, "how do we restore" is the actual continuity
question. We have no runbook. First incident = improvised at 3 AM under
pressure = mistakes.

---

## 3. Recommendations

### R1 — EasyPanel-native daily snapshots (**ship today**)
EasyPanel exposes per-service backups (admin → service → Backups tab).
Enable for `ol-postgres` and `ol-minio` with **daily** cadence and
**14-day retention**. This is the cheapest first line of defense — but
it lives **on the same host**, so it does not address B1 or B4. Treat
it as a tier-1 safety net only.

Action: enable in the EasyPanel UI; document the location in the
runbook below.

### R2 — Logical Postgres backup → off-site bucket (**ship this week**)

Add a sibling EasyPanel service `ol-backup` (alpine + `postgresql-client` +
`mc`) running the script below as a daily cron. Targets a **separate
S3-compatible bucket** outside the EasyPanel host (Backblaze B2, Wasabi,
Cloudflare R2, AWS S3 — pick one).

`scripts/backup.sh`:

```sh
#!/bin/sh
# Daily Postgres dump + off-site upload.
# Runs inside ol-backup container; assumes pg_dump and mc are on PATH.
set -euo pipefail

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP="/tmp/ol-pg-${STAMP}.sql.gz"

echo "[backup] dumping Postgres → ${DUMP}"
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=custom \
  --no-owner \
  --no-acl \
  | gzip -9 > "${DUMP}"

SIZE=$(stat -c%s "${DUMP}")
echo "[backup] dump size: ${SIZE} bytes"
if [ "${SIZE}" -lt 1024 ]; then
  echo "[backup] dump suspiciously small — abort"
  exit 1
fi

mc alias set offsite "${OFFSITE_S3_ENDPOINT}" "${OFFSITE_S3_KEY}" "${OFFSITE_S3_SECRET}"
mc cp "${DUMP}" "offsite/${OFFSITE_BUCKET}/postgres/$(date -u +%Y/%m)/$(basename "${DUMP}")"

# 30-day retention on the offsite side via lifecycle (set once at bucket level),
# but also keep belt-and-suspenders here:
mc rm --recursive --force --older-than 30d "offsite/${OFFSITE_BUCKET}/postgres/" || true

# Mirror MinIO buckets too — these hold logos / attachments / headers
echo "[backup] mirroring MinIO → offsite"
mc alias set local "${MINIO_ENDPOINT}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}"
mc mirror --overwrite local/logos       "offsite/${OFFSITE_BUCKET}/minio/logos/"
mc mirror --overwrite local/attachments "offsite/${OFFSITE_BUCKET}/minio/attachments/"

rm -f "${DUMP}"
echo "[backup] done at $(date -u)"
```

`scripts/Dockerfile.backup`:

```dockerfile
FROM alpine:3.20
RUN apk add --no-cache postgresql16-client gzip ca-certificates curl \
 && curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc \
 && chmod +x /usr/local/bin/mc \
 && apk del curl
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh
# EasyPanel "Schedule" feature runs this on cron (e.g. 0 4 * * *)
CMD ["/usr/local/bin/backup.sh"]
```

Required env (add to `.env.example`):

```
# --- Backup target (off-site S3) ---
OFFSITE_S3_ENDPOINT=https://s3.us-west-002.backblazeb2.com
OFFSITE_S3_KEY=...
OFFSITE_S3_SECRET=...     # write-only key, NOT the master key
OFFSITE_BUCKET=ol-backups
```

**Use a write-only S3 key.** B2/R2/AWS all support keys scoped to
`PutObject` only. If the live host is compromised, the attacker still
cannot delete past backups. This is the single most important
ransomware control.

### R3 — Bucket-side immutability (**1-line config**)
On the off-site bucket: enable **Object Lock / Versioning + Compliance
mode** with a 30-day lock. Even with full credentials, prior backups
cannot be deleted before the lock expires. AWS S3, B2, R2, Wasabi all
support this.

### R4 — Restore drill — quarterly (**operational discipline**)
Add to the team calendar: every 90 days, on a staging EasyPanel project,
restore the most recent dump and run a smoke test:

1. `mc cp offsite/ol-backups/postgres/<latest>.sql.gz /tmp/`
2. `gunzip -c /tmp/<latest>.sql.gz | pg_restore -d $STAGING_DB --clean --no-owner`
3. Boot `ol-app` against the staging DB.
4. Hit `/api/health` → expect `200 ok`.
5. Open `/dashboard` as a known org admin → verify proposal list non-empty.
6. Open one proposal → verify content blocks + uploaded images render.
7. Generate one PDF → verify the deliverable.
8. Document timestamp + result in `docs/BACKUP_DR_AUDIT.md` § Drill log.

If any step fails, the exercise becomes a P0 incident immediately —
this is the only way silent corruption (B3) gets caught before a real
outage.

### R5 — Restore runbook (**write once, update on every drill**)
Create `docs/RESTORE_RUNBOOK.md` with the exact commands an on-call
engineer runs at 3 AM. Template:

```
## Total host loss — Postgres + MinIO recovery

Pre-req: a fresh EasyPanel project with `ol-postgres`, `ol-minio`, `ol-app`
created and started, but empty.

1. Identify the latest good dump:
   mc alias set offsite ${OFFSITE_S3_ENDPOINT} ${OFFSITE_S3_KEY} ${OFFSITE_S3_SECRET}
   mc ls --recursive offsite/${OFFSITE_BUCKET}/postgres/ | sort | tail -5

2. Download and verify size > 1 MB:
   mc cp offsite/${OFFSITE_BUCKET}/postgres/2026/04/ol-pg-20260430T040000Z.sql.gz /tmp/

3. Restore Postgres (DESTRUCTIVE — confirm target DB):
   gunzip -c /tmp/ol-pg-*.sql.gz | docker exec -i ol-postgres pg_restore \
     -U ello -d gerador_propostas --clean --if-exists --no-owner --no-acl

4. Restore MinIO buckets:
   mc mirror --overwrite offsite/${OFFSITE_BUCKET}/minio/logos       local/logos
   mc mirror --overwrite offsite/${OFFSITE_BUCKET}/minio/attachments local/attachments

5. Run schema repair (in case dump predates a migration):
   docker exec ol-app node prisma/migrate.js
   docker exec ol-app node prisma/repair.js

6. Smoke test:
   curl https://app.olivecomunicacao.com.br/api/health
   → expect {"status":"ok","db":"up","redis":"up","minio":"up"}

7. Force all sessions to re-login (post-restore safety):
   rotate NEXTAUTH_SECRET in EasyPanel env, redeploy ol-app
```

Print this. Pin it. Keep a copy outside the EasyPanel host.

### R6 — RPO / RTO targets — make them explicit (**alignment**)
| Metric | Target | Rationale |
|---|---|---|
| **RPO** (max data loss window) | **24 hours** | Daily dumps. Tighter requires WAL archiving — overkill at current scale. |
| **RTO** (time to recover) | **2 hours** | Time for one engineer to follow the runbook on a fresh project. |
| **Backup retention** | 30 days | Object-lock matched. Long enough to catch silent corruption, short enough to be cheap. |
| **Drill cadence** | Quarterly | Aggressive enough to catch breakage; not so aggressive it gets skipped. |

Surface these in `README.md` and in the on-call runbook so expectations
are documented, not folklore.

### R7 — Monitor backup success (**don't trust silence**)
A cron job that fails silently is worse than no backup — operators
think they're safe. Add a 1-line health check:

- After successful upload, the script writes an object
  `offsite/${OFFSITE_BUCKET}/heartbeats/$(date -u +%F).ok` (zero bytes).
- `/api/health` checks: "is there a heartbeat object dated ≤ 26 h ago?"
  If not, set `db.backupStatus = "stale"` in the response.
- An external uptime monitor (Better Stack, Healthchecks.io free tier)
  pings `/api/health` every 15 min and pages on degraded.

Pseudocode:

```ts
// src/lib/backup-status.ts
export async function backupHealth(): Promise<"fresh" | "stale" | "unknown"> {
  if (!process.env.OFFSITE_S3_ENDPOINT) return "unknown";
  const today = new Date().toISOString().slice(0, 10);
  const yday  = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  // HEAD either object via the existing MinIO/S3 SDK against the offsite alias.
  // Return "fresh" if either exists, "stale" otherwise.
}
```

Wire into `/api/health` next to `db`/`redis`/`minio` checks.

### R8 — Encrypt dumps at rest (**defense-in-depth**)
Customer data includes names, emails, password hashes, and proprietary
proposal content. Encrypt the dump before uploading:

```sh
gpg --batch --yes --passphrase "${BACKUP_GPG_PASSPHRASE}" \
    --symmetric --cipher-algo AES256 \
    --output "${DUMP}.gpg" "${DUMP}"
mc cp "${DUMP}.gpg" "offsite/${OFFSITE_BUCKET}/postgres/.../"
```

Store `BACKUP_GPG_PASSPHRASE` in a password manager — **not** in
EasyPanel env (otherwise compromising the host also compromises the
backups). The on-call engineer pastes it during restore.

### R9 — Export EasyPanel project config (**meta-backup**)
Once a month, export the EasyPanel project YAML / env list
(env names + values, service definitions) and check it into a private
GitHub repo (encrypted with `git-crypt` or `sops`). Re-creating the
deployment from scratch is otherwise a memory exercise.

---

## 4. Suggested patch order

| # | Item | Effort | Closes |
|---|---|---|---|
| 1 | **R1** EasyPanel snapshots toggle | 5 min | partial B1 |
| 2 | **R6** RPO/RTO doc + drill date | 15 min | B6 |
| 3 | **R2** Daily off-site `pg_dump` + `mc mirror` | 1 evening | B1, B2, B5 |
| 4 | **R3** Object-lock on offsite bucket | 10 min | B4 |
| 5 | **R5** `docs/RESTORE_RUNBOOK.md` | 30 min | B6 |
| 6 | **R4** First restore drill | 1 hour | B3 |
| 7 | **R7** Health-check heartbeat | 1 hour | silent failure |
| 8 | **R8** GPG encryption of dumps | 20 min | B4 (deeper) |
| 9 | **R9** EasyPanel config export | 30 min | bootstrap loss |

Items 1–6 are the bare minimum for "we have backups and can prove it."
Everything after is hardening.

---

## 5. Drill log

| Date | Operator | Dump used | Result | Notes |
|---|---|---|---|---|
| _pending first drill_ | — | — | — | — |

Append a row after each quarterly exercise. A row with a failed result
is a P0 incident — track to remediation.

---

## 6. Out-of-scope (intentionally)

- **Multi-region active-active** — overkill at current scale. Daily
  off-site logical backup is the right tier.
- **WAL archiving / streaming replica** — buys RPO < 1 minute, costs
  ongoing infra. Revisit when paying customers demand it.
- **Redis backup** — Redis here is purely a rate-limit cache.
  Losing it on host failure is a non-event (limits reset, retry).
  Documented as deliberately ephemeral.
- **Code repository backup** — GitHub is the source of truth. As long as
  the org has 2+ admins with 2FA, this tier is fine.

None blocks deploy. R1–R3 + R5 + R6 close every realistic data-loss
scenario short of provider-wide catastrophe.
