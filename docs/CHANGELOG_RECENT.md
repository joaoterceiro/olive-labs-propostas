# Olive Labs — Resumo das últimas implementações e correções

Período coberto: ciclo recente de hardening + DR (commits `464d83b` → `391f46d`).
Branch: `master`.

---

## 1. Hardening de segurança

### 1.1 Auditoria SQL Injection / XSS / CSRF (`d9bc28c`)
Auditoria focada em três vetores. Doc completo em `docs/INJECTION_XSS_CSRF_AUDIT.md`.

- **SQL Injection — limpo.** Prisma em 100% das rotas; `pg` cru apenas em
  `seed/migrate/repair` com queries parametrizadas. Zero `$queryRawUnsafe`.
- **XSS X1 — corrigido.** `block-editor.tsx` deixou de renderizar HTML do
  Tiptap via `dangerouslySetInnerHTML` no modal de exclusão. Substituído por
  helper `htmlToPlainText()` + `<p>` com clamp.
- **XSS X2 — corrigido.** Adicionado `escapeHtml()` em `src/lib/mailer.ts`
  e aplicado nos 4 callers que compõem `bodyHtml` com campos do usuário
  (envio de proposta, convite admin/usuários, convite admin/orgs/[id]/usuários,
  reset de senha). Fecha phishing via `clientName`, `projectName`, `user.name`.
- **CSRF Y1 — corrigido.** Cookie de sessão NextAuth pinado explicitamente
  como `sameSite: "strict"` + prefixo `__Secure-` em produção (era implícito
  `lax`).
- **CSRF Y2 — corrigido.** Novo `src/lib/origin-guard.ts` + integração no
  `src/middleware.ts`. Toda mutação (POST/PUT/PATCH/DELETE) em `/api/*`
  exceto `/api/auth/`, `/api/cron/` e `/api/health` valida `Origin`/`Referer`
  contra `NEXTAUTH_URL`. Retorna 403 "Bad origin" se não bater.

### 1.2 Auditoria de auth e autorização (`861fcbb` + `34ec1ab`)
Doc em `docs/AUTH_AUTHZ_AUDIT.md`. 4 gaps de least-privilege fechados:
- F1: `requireProposalEditor(id)` (creator OR org-ADMIN OR super-admin) em
  `propostas/[id]` write paths — fecha BOLA onde MEMBER editava proposta de
  colega.
- F2: `requireOrgAdmin()` no PUT `/api/configuracoes`.
- F3: rate-limit `upload:${orgId}` 200/dia em `/api/upload`.

### 1.3 Auditoria de input validation (`1c42472` + `fcf3670`)
26 rotas auditadas, doc em `docs/INPUT_VALIDATION_AUDIT.md`. 6 patches
aplicados (zod schemas + max lengths + regex em PDF, search, admin/orgs,
admin/usuarios/[id], perfil, etc).

### 1.4 Auditoria de secrets (`e776cad` + `fcce8ed`)
Doc em `docs/SECRETS_AUDIT.md`. `.gitignore` reforçado, env discipline
documentada, 2 itens em aberto resolvidos.

### 1.5 Auditoria de superfície API client-side (`2aaed2f`)
Doc em `docs/CLIENT_API_AUDIT.md`. Chaves expostas, endpoints públicos e
trust-boundary mapeados.

---

## 2. Backup, restauração e continuidade (novo)

### 2.1 Auditoria de backup/DR (`8a1dd8b`)
Doc em `docs/BACKUP_DR_AUDIT.md`. **Veredito: 🔴 zero automação até este
ciclo.** Identificados 6 riscos (B1–B6) e 9 recomendações (R1–R9) com
RPO 24h / RTO 2h.

### 2.2 Implementação completa (`391f46d`)
- **`scripts/backup.sh`** — daily `pg_dump --format=custom --compress=9` +
  `mc mirror` dos buckets MinIO (logos, attachments, propostas-pdf) +
  GPG/AES256 opcional + heartbeat diário + prune por retenção. Refusa upload
  se dump < 1 KB.
- **`scripts/Dockerfile.backup`** — alpine + `postgresql16-client` + `gnupg`
  + `mc`. Roda como user não-root.
- **`docs/RESTORE_RUNBOOK.md`** — runbook em 9 seções: restore parcial,
  perda só de Postgres, só de MinIO, perda total do host, migração de
  provider, checklist pós-restore, falhas comuns.
- **`src/lib/backup-status.ts` + `/api/health`** — `backupHealth()` checa
  heartbeat no bucket off-site (cache 5 min). `/api/health` reporta
  `services.backup = {ok, status: "fresh" | "stale" | "unknown" | "error"}`.
  Backup stale **não** derruba o health check (informacional).
- **`.env.example`** — nova seção com `OFFSITE_S3_*`, `OFFSITE_BUCKET`,
  `BACKUP_GPG_PASSPHRASE`, `BACKUP_RETENTION_DAYS`.

---

## 3. UI / UX

### 3.1 De-AI-ification da identidade visual (`de6eb2e`)
Removido glass-morphism (4 classes flatten), neon-glow shadows, shimmer
keyframes, gradient brand chip, badge "PRO", duplicata "Modo Admin",
animate-flash em todos os números, eyebrows ALL-CAPS tracking-wider.
-83/+48 linhas.

### 3.2 Primitivas compartilhadas (`b439bb2` + revisões `97fc0f7` + `6bac364`)
Novos `PageHeader` (title + eyebrow + actions + bordered) e `FormCard`
(title + hint + description + actions). Aplicados em todas as páginas.
Code review pegou 8 itens (2 HIGH + 6 medium/low) — todos corrigidos:
- HIGH-1: stale closure em `autoSave` (deps narradas para `companyName`,
  `clientName`, `projectName`, `date`).
- HIGH-2: `Object.values(body.details).flat()[0]` podia explodir em null —
  type-narrowing + Array.isArray.

### 3.3 Polimento e a11y (`d133127` + `df785a3` + `ab3c493` + `464d83b` + `e6f0a1c`)
- Bump WCAG AA: `#6B6F76` → `#8B8F96` em 27 arquivos (contraste 4.5:1).
- Hierarquia de heading + guard `prefers-reduced-motion` no `animate-flash`.
- Breadcrumb component, login a11y, semantic tokens via `@theme inline`.
- Backlog UX: error boundary, URL state via `useSearchParams`, micro-feedback,
  value flash em subtotais, command palette ⌘K.

### 3.4 Bugs específicos do `/propostas/nova` (`5fc220f` + `81c1d07`)
- Auto-save silenciava quando form incompleto. Adicionado flag `manual` +
  toast listando campos faltantes.
- `/biblioteca`: usuários ignoravam placeholder "Enter para adicionar".
  Adicionado botão "Adicionar" explícito + helper text + ref/focus.

---

## 4. Deploy / infra

- **`c4054aa`** — `prisma/repair.ts` idempotente para drift pós-baseline
  (resolve HTTP 500 em `/api/propostas`).
- **`992d668`** — guard do MinIO pula a fase `phase-production-build` para
  não quebrar `next build` (env runtime ≠ env build).
- **`345c9ea`** — `seed.ts` só exige `SEED_ADMIN_*_PASSWORD` quando o admin
  precisa ser criado (factory `() => string`); redeploy não pede env de
  novo se a row já existe.

---

## 5. Próximos passos (manuais — fora do repo)

1. Provisionar bucket off-site (B2 / R2 / Wasabi / S3) com **Object Lock 30d**
   e **chave write-only**.
2. Adicionar `OFFSITE_S3_*` ao EasyPanel; criar serviço `ol-backup` com
   schedule `0 4 * * *`.
3. Conectar monitor externo (Healthchecks.io / Better Stack / UptimeRobot)
   ao `/api/health` com page-out se `services.backup.ok === false`.
4. **Drill de restauração em ≤ 30 dias** seguindo `RESTORE_RUNBOOK.md` § 5;
   registrar resultado em `BACKUP_DR_AUDIT.md` § 5.
5. Definir RPO 24h / RTO 2h em comunicação interna.
6. Habilitar snapshots nativos do EasyPanel (R1) como tier-1.
7. Export mensal do YAML do EasyPanel para repo privado com `git-crypt`/`sops`
   (R9).

---

## 6. Documentos de referência criados nesta janela

| Arquivo | Conteúdo |
|---|---|
| `docs/INJECTION_XSS_CSRF_AUDIT.md` | SQL/XSS/CSRF — findings + patches |
| `docs/AUTH_AUTHZ_AUDIT.md` | Auth & authz coverage matrix + 4 gaps |
| `docs/INPUT_VALIDATION_AUDIT.md` | Validação em 26 rotas |
| `docs/SECRETS_AUDIT.md` | gitignore, hardcoded creds, env discipline |
| `docs/CLIENT_API_AUDIT.md` | Superfície API client-side |
| `docs/CODE_REVIEW_RECENT_COMMITS.md` | Code review com 10 findings |
| `docs/SECURITY_REVIEW.md` | Security review completo (sessão anterior) |
| `docs/UX_BACKLOG.md` | Backlog UX pós de-AI pass |
| `docs/PRODUCTION_READINESS_PLAN.md` | Plano de production readiness |
| `docs/BACKUP_DR_AUDIT.md` | Backup/DR — risks + R1–R9 + drill log |
| `docs/RESTORE_RUNBOOK.md` | Runbook operacional de restauração |
| `docs/CHANGELOG_RECENT.md` | (este arquivo) |
