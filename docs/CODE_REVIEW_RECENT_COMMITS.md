# Code Review — recent commits

**Scope:** the last 3 commits that changed runtime code:

- `b439bb2` ui: shared `PageHeader` + `FormCard` primitives + 3 list pages migrated
- `c4054aa` fix(deploy): idempotent schema repair (`prisma/repair.ts`)
- `5fc220f` fix(nova): manual `autoSave` feedback in proposal-builder

Plus a quick sweep of `81c1d07` (biblioteca deliverable button) since it ships in the same window.

---

## Summary

Solid set of changes. The `repair.ts` + entrypoint wiring is the right defensive move for the schema-drift class of bug. The `autoSave({manual})` refactor closes the "silent save button" UX gap cleanly. The `PageHeader` / `FormCard` extraction is a healthy de-duplication. There are five concrete fix-worthy items below — none is a release blocker, but the **stale closure on `autoSave`** is worth landing soon.

---

## Critical issues

| # | File | Line | Issue | Severity |
|---|------|------|-------|----------|
| — | — | — | None found that block release | — |

## High

| # | File | Line | Issue | Severity |
|---|------|------|-------|----------|
| 1 | `src/components/proposals/proposal-builder.tsx` | ~339 | **Stale closure / dep churn:** `useCallback(autoSave, [..., formData])` lists the whole `formData` object. Every keystroke creates a brand-new `autoSave` reference. The auto-save timer `useEffect([hasUnsavedChanges, autoSave])` then gets a new dep every keystroke and the 8 s timer is reset more than necessary (also adds GC pressure). Narrow the dep list to the four fields you actually read in the guard. | 🟠 High |
| 2 | `src/components/proposals/proposal-builder.tsx` | ~358 | **Unsafe error parsing:** `Object.values(body.details).flat()[0]` assumes `details` is an object of arrays. If the server ever returns `details: null`, a string, or a Zod issue tree, this throws inside the `catch` (caught by the outer `catch`, but it shadows the real server error). Guard with `details && typeof details === "object"` and check `Array.isArray` before `.flat()`. | 🟠 High |

## Medium

| # | File | Line | Issue | Category |
|---|------|------|-------|----------|
| 3 | `prisma/repair.ts` | last DO block | The `pg_constraint` lookup checks `conname` without a schema filter. On a multi-schema DB the FK could exist in another schema and the script would still try to recreate it (PG would reject). Today the app uses only `public`, so it works, but adding `AND connamespace = 'public'::regnamespace` would make it future-proof. | Correctness |
| 4 | `src/components/ui/page-header.tsx` | header div | `border-b border-white/[0.04] pb-5` is hard-coded. When a page chooses to nest cards directly underneath, the bottom border can stack with the card's top border into a heavy 2 px line. Either drop the border (use spacing only) or add a `bordered={false}` opt-out prop. | Visual consistency |
| 5 | `src/components/proposals/proposal-form.tsx` | `const FormSection = FormCard` | Aliasing the import as `FormSection` keeps two names alive in the codebase for the same thing. Pick one (`FormCard`) and let the next pass replace `<FormSection>` JSX with `<FormCard>`. The alias also breaks the IDE "rename symbol" refactor for new contributors. | Maintainability |

## Low

| # | File | Line | Issue | Category |
|---|------|------|-------|----------|
| 6 | `src/app/(dashboard)/biblioteca/page.tsx` | `addDeliverable` | After adding a tag, focus stays on the input by inertia (the input wasn't blurred). Works in practice but with the new explicit button click, the button keeps focus and the user has to click back into the input to type the next tag. Add `inputRef.current?.focus()` after `setTagInput("")` for chained adds. | UX |
| 7 | `src/components/ui/form-card.tsx` | header row | `flex items-baseline justify-between gap-3` doesn't wrap when `hint` is long. On a 360 px viewport with a 2-word title and a 4-word hint, hint truncates. Add `flex-wrap` so it folds to a second line gracefully. | Mobile |
| 8 | `src/components/proposals/proposal-builder.tsx` | toast on missing fields | The warning lists all missing fields. If 4–5 are missing the toast becomes verbose ("Para salvar preencha: A, B, C, D, E"). Cap to first 3 and append "…+2". Minor. | UX |
| 9 | `prisma/repair.ts` | `process.exit(1)` on first error | Strict-fail is good for production, but for a partial-state DB (e.g. one of the columns exists, another doesn't, third throws on FK ordering) you stop short. Each statement is independent — could collect failures and report all of them, then exit non-zero. | Operability |
| 10 | `src/components/proposals/proposal-builder.tsx` | `manual` toast text | "Rascunho salvo." doesn't distinguish first POST from PUT update. For the **first** save it's worth saying "Rascunho criado." so the user understands a new draft now exists in `/propostas`. | Copy / clarity |

## Maintainability

- **Duplicate `lastSaveRef.current` comparison + ref**: the manual-mode toast and the auto-mode no-op share the same code path now. Consider moving the comparison to a tiny pure helper to keep `autoSave` readable.
- **`PageHeader` already has 3 callers** (propostas / clientes / biblioteca). The 4 remaining list/edit pages (`/configuracoes`, `/perfil`, `/clientes/[id]`, admin pages) still hand-roll their own header rows. Sweep + migrate is a 30-minute follow-up that pays back forever.
- **Test coverage**: `repair.ts` has no unit/integration test. A simple Vitest with `pg-mem` could verify the IF-NOT-EXISTS branches don't throw on a clean schema.

## What looks good

- `repair.ts` is **idempotent by construction**, runs every deploy, logs each statement clearly, and decouples the migration tracking from the actual schema state. This is exactly the right escape hatch for the auto-baseline foot-gun.
- The `manual: boolean` flag pattern in `autoSave` is the cleanest way to differentiate user intent from background work without forking the function.
- `PageHeader` and `FormCard` are small, prop-friendly, and don't over-engineer (no compound components yet — promote later if needed).
- Server-error surfacing (`body.error → details[0] → status code`) gives the user actually useful feedback. Big improvement over generic "Save failed".
- Press-state feedback (`active:scale-[0.97]` on the salvar button) keeps the touch-target rule §2 happy on mobile.

## Verdict

**Approve with follow-ups.** Land items #1 and #2 in the next push (10-line fix). Items #3–#10 are nice-to-have polish for the next refactor session. Nothing here justifies blocking deploy.
