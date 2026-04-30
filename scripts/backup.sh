#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Olive Labs daily off-site backup
#
# Runs inside the `ol-backup` EasyPanel service, scheduled at e.g. 0 4 * * *.
# Dumps Postgres, mirrors MinIO buckets, encrypts (optional), and pushes to
# an S3-compatible bucket on a DIFFERENT host (Backblaze B2, Cloudflare R2,
# Wasabi, AWS S3 — pick one).
#
# Required env (set in EasyPanel service):
#   POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
#   MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
#   OFFSITE_S3_ENDPOINT, OFFSITE_S3_KEY, OFFSITE_S3_SECRET, OFFSITE_BUCKET
#
# Optional:
#   BACKUP_GPG_PASSPHRASE  — when set, dump is GPG-encrypted before upload.
#   BACKUP_RETENTION_DAYS  — defaults to 30. Lifecycle on the bucket should
#                            also be configured for belt-and-suspenders.
# ─────────────────────────────────────────────────────────────────────────────
set -eu

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DATE_PREFIX="$(date -u +%Y/%m)"
TMPDIR="${TMPDIR:-/tmp}"
DUMP="${TMPDIR}/ol-pg-${STAMP}.dump.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

log() {
  echo "[backup $(date -u +%H:%M:%S)] $*"
}

cleanup() {
  rm -f "${DUMP}" "${DUMP}.gpg" 2>/dev/null || true
}
trap cleanup EXIT

# ── 1. Postgres dump (custom format, gzip-compressed) ──────────────────────
log "dumping Postgres ${POSTGRES_DB}@${POSTGRES_HOST} → ${DUMP}"
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=custom \
  --no-owner \
  --no-acl \
  --compress=9 \
  > "${DUMP}"

SIZE=$(stat -c%s "${DUMP}" 2>/dev/null || stat -f%z "${DUMP}")
log "dump size: ${SIZE} bytes"
if [ "${SIZE}" -lt 1024 ]; then
  log "FATAL: dump suspiciously small (<1 KB) — abort, do not upload"
  exit 1
fi

# ── 2. Optional GPG encryption ─────────────────────────────────────────────
UPLOAD_FILE="${DUMP}"
if [ -n "${BACKUP_GPG_PASSPHRASE:-}" ]; then
  log "encrypting dump with AES256"
  echo "${BACKUP_GPG_PASSPHRASE}" | gpg --batch --yes --passphrase-fd 0 \
    --symmetric --cipher-algo AES256 \
    --output "${DUMP}.gpg" "${DUMP}"
  UPLOAD_FILE="${DUMP}.gpg"
  rm -f "${DUMP}"
fi

# ── 3. Off-site upload (Postgres) ──────────────────────────────────────────
log "configuring offsite client"
mc alias set offsite "${OFFSITE_S3_ENDPOINT}" "${OFFSITE_S3_KEY}" "${OFFSITE_S3_SECRET}" >/dev/null

REMOTE_PG="offsite/${OFFSITE_BUCKET}/postgres/${DATE_PREFIX}/$(basename "${UPLOAD_FILE}")"
log "uploading → ${REMOTE_PG}"
mc cp "${UPLOAD_FILE}" "${REMOTE_PG}"

# ── 4. MinIO mirror (logos, attachments, PDFs) ─────────────────────────────
log "configuring local MinIO client"
mc alias set local \
  "${MINIO_USE_SSL:+https}${MINIO_USE_SSL:-http}://${MINIO_ENDPOINT}:${MINIO_PORT:-9000}" \
  "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}" >/dev/null

for bucket in "${MINIO_BUCKET_LOGOS:-logos}" \
              "${MINIO_BUCKET_ATTACHMENTS:-attachments}" \
              "${MINIO_BUCKET_PDFS:-propostas-pdf}"; do
  if mc ls "local/${bucket}" >/dev/null 2>&1; then
    log "mirroring local/${bucket} → offsite/${OFFSITE_BUCKET}/minio/${bucket}/"
    mc mirror --overwrite --quiet \
      "local/${bucket}" \
      "offsite/${OFFSITE_BUCKET}/minio/${bucket}/" || \
      log "WARN: mirror of ${bucket} returned non-zero — continuing"
  else
    log "skip: bucket '${bucket}' does not exist locally"
  fi
done

# ── 5. Heartbeat object — consumed by /api/health backupStatus ─────────────
HEARTBEAT_FILE="${TMPDIR}/heartbeat-$(date -u +%F).ok"
echo "ok ${STAMP}" > "${HEARTBEAT_FILE}"
mc cp "${HEARTBEAT_FILE}" \
  "offsite/${OFFSITE_BUCKET}/heartbeats/$(date -u +%F).ok" >/dev/null
rm -f "${HEARTBEAT_FILE}"

# ── 6. Local-side retention prune (bucket lifecycle should also be set) ───
log "pruning offsite Postgres dumps older than ${RETENTION_DAYS}d"
mc rm --recursive --force \
  --older-than "${RETENTION_DAYS}d" \
  "offsite/${OFFSITE_BUCKET}/postgres/" >/dev/null 2>&1 || true

log "pruning offsite heartbeats older than 14d"
mc rm --recursive --force \
  --older-than 14d \
  "offsite/${OFFSITE_BUCKET}/heartbeats/" >/dev/null 2>&1 || true

log "done"
