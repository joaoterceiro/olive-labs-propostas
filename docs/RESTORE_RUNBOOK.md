# Olive Labs — Restore Runbook

> **Print this. Pin it. Keep a copy outside EasyPanel.**
> If you are reading this during an incident: take a breath, then go to § 2.

**RPO target:** ≤ 24 h (daily off-site dumps)
**RTO target:** ≤ 2 h (one engineer following this runbook on a fresh project)
**Last tested:** _pending first drill — see `docs/BACKUP_DR_AUDIT.md` § 5_

---

## 0. Pre-requisites you need at hand

You will need, in this order:

1. **EasyPanel admin access** (or a fresh hosting environment if the entire
   provider is down).
2. **Off-site bucket credentials** —
   `OFFSITE_S3_ENDPOINT`, `OFFSITE_S3_KEY`, `OFFSITE_S3_SECRET`, `OFFSITE_BUCKET`.
   Stored in: _team password manager → vault "Olive Labs / Backup"_.
3. **`BACKUP_GPG_PASSPHRASE`** if dumps are encrypted (R8). Same vault.
4. **GitHub access** to redeploy `ol-app` from `master`.
5. A laptop with `mc` (MinIO client) and `pg_restore` installed locally.
   Install on the fly:
   ```sh
   # macOS
   brew install minio/stable/mc postgresql@16
   # Linux
   curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc \
     -o ~/bin/mc && chmod +x ~/bin/mc
   apk add postgresql16-client          # or apt install postgresql-client-16
   ```

---

## 1. Identify the scenario

| Scenario | Goto |
|---|---|
| Single bad migration / corrupted table | § 2 |
| Operator deleted rows / dropped a table | § 2 |
| Postgres host lost, MinIO intact | § 3 |
| MinIO host lost, Postgres intact | § 4 |
| Total host loss (EasyPanel project gone) | § 5 |
| EasyPanel provider down (move to new provider) | § 5 + § 6 |

---

## 2. Partial restore — bring back a table or a few rows

Use this when you know what was lost and the target DB is still up.

```sh
# 1. List recent dumps
mc alias set offsite "$OFFSITE_S3_ENDPOINT" "$OFFSITE_S3_KEY" "$OFFSITE_S3_SECRET"
mc ls --recursive "offsite/$OFFSITE_BUCKET/postgres/" | sort | tail -10

# 2. Download one dump (pick one timestamped BEFORE the bad event)
mc cp "offsite/$OFFSITE_BUCKET/postgres/2026/04/ol-pg-20260429T040000Z.dump.gz" \
      /tmp/restore.dump.gz

# 3. If encrypted, decrypt
gpg --batch --yes --passphrase "$BACKUP_GPG_PASSPHRASE" \
    --output /tmp/restore.dump --decrypt /tmp/restore.dump.gz.gpg
# (skip if .gz only — gunzip is built into pg_restore for custom format)

# 4. Restore ONLY the affected table into the live DB
gunzip -c /tmp/restore.dump.gz | pg_restore \
  -h <postgres-host> -U ello -d gerador_propostas \
  --data-only \
  --table=proposal \
  --no-owner --no-acl

# Or restore one record via psql + a temp DB:
createdb -h <host> -U ello tmp_restore
gunzip -c /tmp/restore.dump.gz | pg_restore -h <host> -U ello -d tmp_restore
psql -h <host> -U ello -d tmp_restore \
  -c "COPY (SELECT * FROM proposal WHERE id='<lost-id>') TO STDOUT" \
  | psql -h <host> -U ello -d gerador_propostas \
  -c "COPY proposal FROM STDIN"
dropdb -h <host> -U ello tmp_restore
```

> **WARNING:** `pg_restore --clean --if-exists` will DROP existing tables
> first. For partial restore, use `--data-only --table=` and never `--clean`.

---

## 3. Postgres host lost — MinIO survived

```sh
# 1. Recreate ol-postgres in EasyPanel (same image, same env vars,
#    same volume name → EasyPanel re-creates an empty pgdata).

# 2. Restore the latest dump
mc alias set offsite "$OFFSITE_S3_ENDPOINT" "$OFFSITE_S3_KEY" "$OFFSITE_S3_SECRET"
LATEST=$(mc ls --recursive "offsite/$OFFSITE_BUCKET/postgres/" \
         | awk '{print $NF}' | sort | tail -1)
mc cp "offsite/$OFFSITE_BUCKET/postgres/$LATEST" /tmp/restore.dump.gz

# 3. Decrypt if needed (see § 2 step 3)

# 4. Restore (DESTRUCTIVE — but target DB is empty so this is fine)
gunzip -c /tmp/restore.dump.gz | docker exec -i ol-postgres pg_restore \
  -U ello -d gerador_propostas \
  --clean --if-exists \
  --no-owner --no-acl

# 5. Run schema repair (in case the dump predates a deployed migration)
docker exec ol-app node prisma/migrate.js
docker exec ol-app node prisma/repair.js

# 6. Smoke test
curl https://app.olivecomunicacao.com.br/api/health
# Expect: {"ok":true,"services":{"db":{"ok":true},...}}

# 7. Force re-login (post-restore safety — invalidates any leaked sessions)
#    In EasyPanel: rotate NEXTAUTH_SECRET, redeploy ol-app.
```

---

## 4. MinIO host lost — Postgres survived

```sh
# 1. Recreate ol-minio in EasyPanel (empty volume).

# 2. Mirror the off-site copy back into local MinIO
mc alias set offsite "$OFFSITE_S3_ENDPOINT" "$OFFSITE_S3_KEY" "$OFFSITE_S3_SECRET"
mc alias set local   "http://ol-minio:9000" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"

for bucket in logos attachments propostas-pdf; do
  mc mb "local/$bucket" 2>/dev/null || true
  mc mirror --overwrite "offsite/$OFFSITE_BUCKET/minio/$bucket/" "local/$bucket"
done

# 3. Smoke test — open /dashboard and verify a proposal's logo and
#    header image render. If 404 in the browser, the proposal's
#    `headerImageUrl` may point at a key that wasn't mirrored —
#    check `mc ls local/logos | wc -l` against pre-incident counts.
```

---

## 5. Total host loss — full recovery from scratch

```sh
# 1. Provision a new EasyPanel project. Create services (use same names
#    so the in-DB references like 'ol-postgres' resolve):
#      - ol-postgres   (postgres:16-alpine, persistent volume "pgdata")
#      - ol-redis      (redis:7-alpine, no persistent volume needed)
#      - ol-minio      (minio/minio:latest, persistent volume "miniodata")
#      - ol-app        (build from GitHub master)

# 2. Set ALL env vars from the most recent EasyPanel config export
#    (R9 in BACKUP_DR_AUDIT.md). If no export exists, you will need:
#      DATABASE_URL, REDIS_URL, MINIO_ENDPOINT, MINIO_ACCESS_KEY,
#      MINIO_SECRET_KEY, NEXTAUTH_SECRET (rotate this!), NEXTAUTH_URL,
#      SMTP_*, SEED_ADMIN_*_PASSWORD, CRON_SECRET,
#      OFFSITE_S3_*, BACKUP_GPG_PASSPHRASE (in ol-backup only).

# 3. Boot ol-postgres, ol-redis, ol-minio. Wait for healthy.

# 4. Run § 3 (restore Postgres) and § 4 (mirror MinIO back).

# 5. Boot ol-app. docker-entrypoint.sh runs migrate + repair + seed
#    automatically. Migrations should be no-ops (data is already current),
#    repair handles any drift, seed is idempotent (upsert on email).

# 6. Smoke test (run all):
curl https://app.olivecomunicacao.com.br/api/health
# Login as a known super-admin → /admin → org list non-empty
# Open one proposal → blocks render, images load
# Generate one PDF → file downloads
# Send one test email (e.g. password reset) → arrives

# 7. Reconfigure ol-backup service with the same OFFSITE_* env vars
#    so future backups continue. Verify a heartbeat appears in
#    offsite/$OFFSITE_BUCKET/heartbeats/ within 24 h.

# 8. Update DNS (app.olivecomunicacao.com.br → new EasyPanel host).
#    TTL 300s makes this fast; if longer, plan a cutover window.
```

---

## 6. Provider-level move (off EasyPanel)

The off-site bucket is provider-agnostic. Steps are identical to § 5
on the new provider; the only difference is rebuilding the container
runtime there. The Dockerfile + docker-entrypoint.sh in the repo are
self-contained — any host that runs Docker will work.

---

## 7. Post-restore checklist

- [ ] `/api/health` returns `200 ok` with all services up
- [ ] `/api/health` reports `backupStatus: fresh` within 26 h of next backup
- [ ] At least one super-admin can log in
- [ ] At least one proposal renders end-to-end (HTML + images + PDF)
- [ ] Outbound email works (send a test reset request)
- [ ] Rotate `NEXTAUTH_SECRET` to invalidate any pre-incident sessions
- [ ] Rotate any DB / MinIO / SMTP credentials that may have been on the
      compromised host
- [ ] Append a row to `docs/BACKUP_DR_AUDIT.md` § 5 (Drill log) with
      timestamp + result + notes (what the runbook didn't cover, gaps to fix)
- [ ] Open a follow-up ticket for any step that took longer than expected

---

## 8. Common failures during restore

| Symptom | Likely cause | Fix |
|---|---|---|
| `pg_restore: error: could not execute query: ERROR: role "ello" does not exist` | Target DB doesn't have the role | `CREATE ROLE ello LOGIN PASSWORD '...';` then retry. Dump used `--no-owner --no-acl` so this should not happen. |
| Dump file is 0 bytes | Backup script failed silently before this date — check `mc ls` for older valid file | Use the previous day's dump and accept the additional data loss |
| `mc: <ERROR> Unable to initialize new alias from the provided credentials` | Wrong endpoint URL or expired key | Re-check vault entry, confirm endpoint includes scheme + region |
| Health check shows `db.ok=true` but `/dashboard` is 500 | Schema drift — dump older than current code | `docker exec ol-app node prisma/repair.js` |
| Images 404 in browser | MinIO mirror missed a bucket or key | `mc ls --recursive local/<bucket> \| wc -l` vs the dashboard's expected count; re-run mirror |
| GPG `decryption failed: Bad session key` | Wrong passphrase | Try previous passphrase from password manager history |

---

## 9. What this runbook does NOT cover

- **Restoring deleted user accounts via app UI** — there is no soft-delete;
  use § 2 partial restore on the `User` and `Membership` tables.
- **PII redaction during restore to staging for a drill** — out of scope;
  drills run with full data on a temporary staging project that gets
  destroyed after the smoke test.
- **Cross-version Postgres upgrade** — if the offsite dump was made on
  PG 16 and the new target is PG 17, both `pg_restore` versions need to
  match the target. Use `pg_restore` from the **target** version.
