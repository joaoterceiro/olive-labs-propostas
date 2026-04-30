# UX Backlog — what's still rough

Pass made with the `ui-ux-pro-max` rubric (§1–§10) after the de-AI commit `de6eb2e`. Items are grouped by severity for the next sprint.

---

## P0 — release-class gaps

### 1. No top-level `ErrorBoundary`
- Where: `src/app/(dashboard)/layout.tsx`, `(admin)/layout.tsx`
- Today: an uncaught render error blanks the whole route — the user sees a Next.js generic 500 page with no way back.
- Fix: wrap each section in a client-side `<ErrorBoundary>` that shows a card with the message + a "Recarregar" button + a `console.error` capture.

### 2. PDF button on `/propostas/nova` doesn't guard for unsaved drafts
- Where: A4 preview header → "Baixar PDF"
- Today: opens `/propostas/{id}/pdf` even when `savedProposalId` is `null` → 404.
- Fix: disable the button until the first POST returns; tooltip "Salve o rascunho para baixar o PDF."

### 3. Form validation only fires on submit
- Where: `proposal-form.tsx`, `clientes/page.tsx` modal, `perfil/page.tsx`
- Today: the user only sees errors after clicking "Gerar proposta" / "Salvar". `Input` already supports `aria-invalid`/`aria-describedby` but no on-blur validator runs.
- Fix: pass an `onBlurValidate` (zod field) to each `Input`, set the `errors[field]` slice when blur fires non-empty + invalid.

---

## P1 — meaningful UX gaps

### 4. State preservation on `/propostas` list
- Today: filters (`statusFilter`, `search`) and `page` live only in `useState`. Browser back from `/propostas/[id]` resets them.
- Fix: lift state to URL search params via `useSearchParams` + `router.replace`; restore from the URL on mount.

### 5. Empty states missing on `/clientes` and `/dashboard`
- `/clientes` table page hides empty case behind the same skeleton; no first-run CTA.
- `/dashboard` shows zero counts when the org has no proposals — no onboarding card pointing to "Cadastrar serviço" → "Criar proposta".
- Fix: shared `<OnboardingChecklist>` for new orgs (3-step), shown until first proposal exists.

### 6. Nested-click ambiguity in `DataTable`
- Where: `src/components/ui/data-table.tsx`
- Rows now have `role="button"` + `Enter/Space`; action buttons in the last column also click. A click on the action propagates to the row click → opens the detail page **and** triggers the action.
- Fix: `event.stopPropagation()` on every per-row icon button (delete, duplicate, view, pdf).

### 7. Heavy components loaded eagerly
- `TiptapEditor` (~70 KB), `A4Preview` (~30 KB), full proposal-builder loaded on first paint of every dashboard route via the import graph.
- Fix: `next/dynamic` import inside `proposals/nova/page.tsx` and `[id]/editar/page.tsx` for the builder. Pre-render skeleton.

### 8. No bulk actions on `/propostas`
- Power-user gap: 30 drafts to delete = 30 clicks.
- Fix: optional row checkbox column in `DataTable`, a sticky footer "X selecionadas — Excluir | Mudar status" appears when ≥1 row checked.

### 9. Confirmação destrutiva inconsistente
- `/propostas/[id]` delete uses `Modal` ✓
- `/clientes` delete uses `Modal` (verify)
- Some pages still use `window.confirm` per earlier audit
- Fix: audit `grep -r "window.confirm"` and replace.

---

## P2 — polish and operational quality

### 10. Login decorative layers always rendered
- `<Particles />` and `<GridBackground />` paint on every viewport, including mobile. Battery + scroll-jank cost.
- Fix: hide via `hidden sm:block` and `prefers-reduced-motion` guard.

### 11. Toast position vs sticky CTA on `/propostas/nova`
- Bottom-right toast lands on top of the sticky "Gerar proposta" bar.
- Fix: lift toast container to `bottom-6 right-6 sm:bottom-20` only on routes with sticky footer; or just move all toasts to top-right.

### 12. Native `<input type="date">` UX varies by browser
- Safari shows different control; Firefox shows different placeholder format. Brazilian users may not recognize `mm/dd/yyyy` fallbacks.
- Fix: thin date-picker (Day Picker / `react-day-picker`) with locale `pt-BR` and `dateFormat="dd/MM/yyyy"`.

### 13. ServiceCard "Nome personalizado" placeholder ambiguity
- Placeholder = the actual service name. Users sometimes assume it's the saved value. Reword: `Ex: Identidade visual completa (deixe em branco para usar o nome padrao)`.

### 14. No keyboard shortcut help
- ⌘K palette exists but unadvertised. Power users won't discover it without docs.
- Fix: `?` key opens a small modal with the shortcut list.

### 15. Avatar fallback for missing/short user name
- Header `userName.charAt(0)` errors if `userName` is undefined; FormCard org-chip uses `displayOrgName.charAt(0)` — same risk if name is empty/whitespace.
- Fix: defensive `(name?.trim()?.charAt(0) ?? "?").toUpperCase()`.

### 16. `#4A4B50` muted text still appears
- Used for kbd hints, group titles in collapsed sidebar. Contrast on `#0C0C0E` is ~2.0:1 (fails WCAG AA for any text).
- Fix: bump to `#6B6F76` for those uses or rely on bg-color carriers (kbd already has its own bg).

### 17. No `next/image` on uploaded logos / preview thumbnails
- `<img src={value}>` everywhere → no CLS reservation, no auto AVIF. Acceptable for 8 KB SVG logos but image proposals (>200 KB) suffer.
- Fix: configure `next.config.images.remotePatterns` for MinIO domain + replace `<img>` in `image-upload.tsx` and `a4-preview.tsx` (where the preview iframe doesn't sandbox).

### 18. No light-mode support
- The whole app is dark-only. Modern SaaS apps offer both. Low priority but tracked.
- Fix: bind colors to `var(--color-*)` tokens already added; add `data-theme="light"` mapping.

### 19. No "what's new" / release notes mechanism
- Users can't see what changed since their last login. Trivial to add (markdown file + tiny modal with `localStorage` hash).

### 20. Bundle budget unmonitored
- No `next build` size check in CI; hard to catch regressions.
- Fix: GitHub Action with `next bundle-analyzer` per PR or a soft 250 KB First Load JS budget.

---

## Quick wins (5 minutes each)

- **Strip placeholder ambiguity** on the proposal date input — show `30/04/2026` as helper instead of placeholder.
- **`stopPropagation`** on every DataTable row icon button.
- **Avatar fallback** to `?` instead of crashing on empty name.
- **Tooltip on disabled "Baixar PDF"** explaining "Salve o rascunho primeiro".
- **`hidden sm:block`** on `<Particles />`.

## Hot-take

The chrome is now **calm enough** that further polish should focus on **flow**, not surface. The two strongest investments for the next sprint:

1. **State preservation in `/propostas` list** (URL-driven filters) — the single biggest "this is a real product" signal we're missing.
2. **`ErrorBoundary` + inline validation** — turns silent broken states into recoverable ones.

Everything else is incremental.
