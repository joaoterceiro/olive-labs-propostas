# Olive Labs — Plano de Correção para Produção

Auditoria realizada em 2026-04-21. Base: commit `f0ec48f`.
Status: app implantado em https://app.olivecomunicacao.com.br, login funcional, mas vários gaps de produção.

---

## 1. BLOQUEADORES DE PRODUÇÃO (P0)

Gaps que quebram segurança, confiabilidade ou funcionalidades prometidas. **Precisam ser fechados antes de abrir para clientes.**

### 1.1 Migrations Prisma falham silenciosamente no deploy
- `docker-entrypoint.sh` usa `npx prisma migrate deploy ... || echo` — mascarando falhas.
- Prisma binário no container está sem a dep transitiva `pathe` (descoberto manualmente). Toda nova migration hoje depende de execução manual via `node -e` + `pg`.
- **Ação:** ajustar Dockerfile para copiar `node_modules` completo do estágio `builder` (ou instalar `pathe` explicitamente) e remover o `|| echo` do entrypoint. Migrations quebradas devem derrubar o container.

### 1.2 Seed não executa via entrypoint
- Idêntico ao 1.1 — mascarado por `|| echo`.
- **Ação:** reescrever `docker-entrypoint.sh` para parar com `exit 1` em falha de migrate. Seed deve ser idempotente (já é) e rodar em separado com retry.

### 1.3 Sem middleware de autenticação server-side
- Não existe `src/middleware.ts`. Proteção de rotas depende apenas de `requireSession()` nos route handlers e redirect client-side. Navegação direta a `/dashboard/*` pode renderizar shell antes do redirect.
- **Ação:** criar `src/middleware.ts` com matcher `['/(dashboard|admin)/:path*', '/api/(?!auth).*']` bloqueando sem sessão.

### 1.4 Sem e-mail (SMTP/Resend)
- Nenhuma integração de envio. Impacto:
  - Botão "Esqueceu a senha?" (login/page.tsx:405) não faz nada.
  - Novo usuário convidado não recebe credenciais.
  - Proposta com status `SENT` não é enviada ao cliente — status é só cosmético.
- **Ação:** adicionar `lib/mailer.ts` com Resend ou SMTP. Criar rotas `/api/auth/reset-request`, `/api/auth/reset-confirm`, `/api/propostas/[id]/send`.

### 1.5 Edição de proposta existente não implementada
- `proposal-builder.tsx` sempre inicia com estado vazio; não há carregamento de proposta pelo `id`.
- "Editar" na lista de propostas leva a `/propostas/[id]` (view-only).
- **Ação:** criar rota `/propostas/[id]/editar` que hidrata `proposal-builder` via `initialProposal` prop.

### 1.6 Sem proteção de role nas APIs admin
- `/api/admin/*` checa `requireSuperAdmin` em algumas rotas, mas rotas normais (clientes, propostas, servicos) não diferenciam `ADMIN` vs `MEMBER` da organização. Qualquer membro pode apagar dados.
- **Ação:** adicionar guards por rota (`requireOrgAdmin()`).

### 1.7 Sem rate limiting
- Login, upload e reset de senha expostos sem throttling. Brute force viável.
- **Ação:** adicionar `@upstash/ratelimit` usando o Redis já provisionado. Limitar login a 5/min por IP+email.

### 1.8 Validação de upload incompleta
- `api/upload/route.ts` valida tamanho e bucket, mas **não valida MIME type real** (só o nome/extensão). Cliente pode subir `.exe` renomeado como `.png`.
- **Ação:** usar `file-type` para sniff dos primeiros bytes e rejeitar fora de `image/png|jpeg|webp`.

---

## 2. FUNCIONALIDADES INCOMPLETAS (P1)

Presentes na UI mas sem backend ou com lacunas evidentes.

| Local | Problema | Correção |
|---|---|---|
| `login/page.tsx:405` | Botão "Esqueceu a senha?" inerte | Criar fluxo `/esqueci-senha` + `/redefinir-senha` |
| `sidebar.tsx` | Busca global (⌘K) decorativa | Implementar `cmdk` com index de propostas/clientes/serviços |
| `Proposal.bodyImages` | Campo existe no schema, tipo definido, mas UI do block-editor cobre 95% dos casos. Verificar se `bodyImages` ainda é usado — candidato a remoção | Auditar e remover se substituído por `contentBlocks` |
| `ProposalStatus.EXPIRED` | Status existe mas nada seta automaticamente | Criar job cron diário que marca propostas >30d em `SENT` como `EXPIRED` |
| `Attachment` model | Existe mas nenhuma rota CRUD usa | Decidir: remover modelo ou implementar anexos em `/propostas/[id]` |
| `configuracoes/page.tsx` | Falta upload de logo, cores customizáveis não aplicadas no PDF | Fechar loop cor→PDF (route já usa `primaryColor` parcialmente) |
| `propostas/[id]/page.tsx` | Sem botão "Enviar ao cliente por e-mail" | Adicionar ação após 1.4 |
| `perfil/page.tsx` | Alterar senha existe, mas sem força mínima | Validar min 8 chars + 1 número no front e back |
| Primeiro login de usuário convidado | Admin define senha manualmente na UI, usuário recebe texto | Trocar por convite com token via e-mail (depende 1.4) |

---

## 3. QUALIDADE DE CÓDIGO (P2)

- **46 blocos `catch {}` vazios** (grep confirmou) descartando contexto de erro. Padrão: substituir por `catch (e) { console.error(...); toast(...) }` + Sentry em produção.
- **Zero testes** (`find -name '*.test.*'` vazio). Mínimo viável: testes de regressão nos route handlers críticos (`propostas`, `auth`, `upload`) com Vitest + supertest.
- **`any` residual** em `components/ui/data-table.tsx:10`. Tipar com generic constraint.
- **Fontes via `@import url(...)`** em `globals.css` e `(auth)/layout.tsx` → render-blocking. Migrar para `next/font/google` (Montserrat).
- **`console.error` soltos** em PDF/upload → centralizar via logger (`pino`).
- **Arquivos >400 linhas**: `clientes/page.tsx` (415), `propostas/page.tsx` (366), `perfil/page.tsx` (323), `biblioteca/page.tsx` (317). Separar em subcomponentes.
- **Prisma client gerado** (`src/generated/prisma`) está commitado — aumenta repo. Deveria ser em `.gitignore` e gerado no build (já é). Remover commits.

---

## 4. OBSERVABILIDADE / OPS (P2)

- Sem endpoint `/api/health` — EasyPanel não consegue healthcheck real.
- Sem logs estruturados — console puro.
- Sem Sentry/GlitchTip para erros em runtime.
- Sem backup automático do Postgres.
- Sem monitoring de uso de MinIO (buckets podem crescer sem controle).
- Container Puppeteer não tem timeout — PDF travado = processo preso indefinidamente.

**Ações:**
1. `GET /api/health` que pinga Prisma + Redis + MinIO.
2. `lib/logger.ts` com `pino` + `pino-pretty` em dev.
3. Integrar Sentry (free tier) no `next.config.ts`.
4. Script de backup Postgres → MinIO diário (cron container separado).
5. Wrapper em `puppeteer.launch({ timeout: 30_000 })` + `page.setDefaultTimeout(20_000)`.

---

## 5. SEGURANÇA (P1)

- **Sem CSP/headers** de segurança. Adicionar `next.config.ts` com `headers()`:
  - `Content-Security-Policy`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`.
- **Sem CSRF** nas rotas mutáveis — NextAuth já traz, mas APIs POST/PUT não usam. Validar.
- **JWT secret** — confirmar `NEXTAUTH_SECRET` forte em produção (≥32 bytes aleatórios).
- **Senhas fracas aceitas** (sem validação mínima).
- **Upload sem verificação de conteúdo** (ver 1.8).
- **`cnpj` único global na org** mas sem máscara/validação — aceita lixo.
- Credenciais seed (`admin@olivelabs.com / olive@2024`) **devem ser trocadas** antes do primeiro acesso real.

---

## 6. UX / USABILIDADE (P2)

- **Auto-save silencioso**: indicador "Alterações não salvas" / "Salvando..." existe mas timer de 30s é longo. Reduzir para 5–10s de debounce.
- **Feedback de "Salvar como padrão"** para imagens do cabeçalho/rodapé é fraco — só toast. Adicionar checkmark visual.
- **Validação inline** das Inputs: alguns campos só revelam erro após submit. Adicionar validação on-blur.
- **Data em formato brasileiro** no `Input type="date"` — Safari/iOS pode mostrar diferente. Considerar máscara custom.
- **Confirmações destrutivas** (delete cliente/proposta) usam `window.confirm` em alguns pontos. Padronizar via componente Modal.
- **Sidebar busca (⌘K)** sem funcionalidade (ver 2).
- **Loading states**: algumas páginas mostram skeleton, outras spinner, outras nada. Padronizar.
- **Responsivo**: dashboard e proposal-builder **não testados em mobile** — layout `grid-cols-2` quebra. Adicionar breakpoint `md:`.
- **Preview A4** não tem zoom/fit-to-screen.
- **Sem indicador de versão da proposta** — cliente duplicada gera `(copia)` mas não há histórico.
- **Status da proposta só pode avançar** — não há "voltar para rascunho" explícito se cliente pedir ajustes.

---

## 7. PERFORMANCE

- `src/generated/prisma` gerado com `runtime=node`: verificar se `edge-compatible` é necessário em alguma rota.
- Página de propostas carrega todos os items no listing (embora paginado) — OK.
- `a4-preview.tsx` reconstrói HTML inteiro em cada mudança. Adicionar debounce de 200ms.
- Fonts: Montserrat carregada 3x (globals, auth layout, preview). Consolidar via `next/font` e `subsets: ['latin']`.
- `next.config.ts` — verificar se `output: 'standalone'` está + `compress: true`.
- Imagens PNG dos uploads não são otimizadas. Considerar `sharp` no upload para gerar thumbnail.

---

## 8. PLANO DE EXECUÇÃO SUGERIDO

**Sprint 1 — Bloqueadores (5 dias úteis)**
1. Fix Dockerfile + entrypoint (1.1, 1.2) — 0,5d
2. Middleware auth (1.3) — 0,5d
3. SMTP + reset senha + convites (1.4) — 2d
4. Edição de proposta existente (1.5) — 1d
5. Role guards admin (1.6) — 0,5d
6. Rate limit Redis (1.7) — 0,5d

**Sprint 2 — Funcionalidades + Segurança (5 dias)**
1. Validação upload MIME (1.8) — 0,5d
2. CSP/headers (5) — 0,5d
3. Envio da proposta por e-mail (2) — 1d
4. Job de expiração (2) — 0,5d
5. Busca global ⌘K (2) — 1d
6. Health endpoint + Sentry + logger (4) — 1,5d

**Sprint 3 — Qualidade + UX (5 dias)**
1. Suíte de testes mínima rotas críticas — 2d
2. next/font + performance (7) — 0,5d
3. Refactor páginas >400 linhas — 1d
4. Responsividade mobile (6) — 1d
5. Padronização de loading/toasts/confirmações (6) — 0,5d

**Total estimado: ~3 sprints (15 dias úteis)** para o app estar de fato pronto para produção multi-tenant.

---

## 9. GO/NO-GO PARA CLIENTES REAIS

Recomendação: **Não abrir para clientes externos enquanto Sprint 1 não estiver fechada.**
Uso interno pela própria Olive Labs é seguro hoje com as credenciais de seed, mas qualquer cadastro externo esbarra em:
- Sem reset de senha (usuário perde acesso → chamado de suporte manual)
- Sem envio de proposta (funcionalidade central não existe)
- Sem middleware (risco de exposição acidental em regressões)
- Migrations frágeis no deploy (qualquer nova migration precisa intervenção manual)
