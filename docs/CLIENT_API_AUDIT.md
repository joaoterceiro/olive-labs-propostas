# Frontend / Client-Side API Surface Audit

**Scope:** every file marked `"use client"` in the React tree (pages,
components, layout, hooks). Goal: confirm no third-party API keys, auth
tokens, or sensitive endpoints are exposed in the browser bundle.

**Date:** 2026-04-22
**Verdict:** ✅ Pass. All sensitive operations are proxied through same-origin
`/api/*` server routes. Zero credentials in client code.

---

## Summary

| Question | Answer |
|---|---|
| Are external 3rd-party API endpoints called from the client? | ✅ No |
| Are API keys / auth tokens used on the client? | ✅ No |
| Are sensitive operations done via a backend? | ✅ Yes — all 23 distinct endpoints are same-origin `/api/*` |
| Are server-only env vars accidentally read on the client? | ✅ No |
| Are `NEXT_PUBLIC_*` env vars used on the client? | ✅ Not on the client (only one reference, in a server-only lib) |

---

## Inventory

**30 files** marked `"use client"`. Across all of them, every `fetch()` call
targets the **app's own backend** at one of these 23 paths:

```
GET / POST / PUT / DELETE  /api/admin/organizacoes
GET / PUT / DELETE          /api/admin/organizacoes/{id}
GET / POST                  /api/admin/organizacoes/{id}/usuarios
GET / POST                  /api/admin/usuarios
PUT / DELETE                /api/admin/usuarios/{id}
POST                        /api/auth/reset-request
POST                        /api/auth/reset-confirm
GET / POST                  /api/clientes
GET / PUT / DELETE          /api/clientes/{id}
GET / PUT                   /api/configuracoes
POST                        /api/pdf
GET / PUT                   /api/perfil
PUT                         /api/perfil/senha
GET / POST                  /api/propostas
GET / PUT / DELETE          /api/propostas/{id}
POST                        /api/propostas/{id}/duplicate
POST                        /api/propostas/{id}/send
GET                         /api/search
GET / POST                  /api/servicos
DELETE                      /api/servicos/{id}
POST                        /api/upload
```

The two non-`/api/` `fetch()` calls in client code are:

| Where | What | Verdict |
|---|---|---|
| `src/components/proposals/a4-preview.tsx:576` | `fetch(blobUrl)` to read a local `URL.createObjectURL(...)` blob and base64-encode it before posting to `/api/pdf` | ✅ Local blob — never hits the network |
| `src/components/layout/sidebar.tsx:11` | `fetch(url)` where `url = "/api/configuracoes"` | ✅ Same-origin |

## External (3rd-party) URLs

Two references found, both **server-side and CSS-only** (no JS execution):

| File | URL | Context |
|---|---|---|
| `src/app/api/propostas/[id]/pdf/route.ts:227` | `fonts.googleapis.com/css2?family=Montserrat...` | Inside the HTML template that Puppeteer renders to PDF |
| `src/components/proposals/a4-preview.tsx:208` | Same URL | Inside the `srcDoc` of the preview iframe |

Both are public Google Fonts URLs. No secrets travel; the request is a `GET`
for a CSS file.

## API keys / tokens on the client

| Check | Result |
|---|---|
| `apiKey` / `x-api-key` references | ✅ None |
| `Authorization: Bearer ...` headers in client code | ✅ None |
| Stripe / AWS / GitHub / Slack / SendGrid / OpenAI tokens | ✅ None |
| Inline secrets pasted into JSX | ✅ None |
| `window.X = ...` exposing data globally | ✅ None |

The app does **not** mint or transmit any API key on the client. Auth is
handled by NextAuth's `next-auth.session-token` HTTP-only cookie, set by
`/api/auth/*` and read transparently by the browser. The cookie is
**HTTP-only** so client JS cannot read it — XSS cannot exfiltrate the
session.

## `process.env` on the client

A scan of every `"use client"` file for `process.env.X` (excluding
`NEXT_PUBLIC_*`) returned **zero hits**. There is no risk of a server-only
env var (DB URL, NextAuth secret, MinIO key, SMTP password) being inlined
into the JS bundle.

The single `NEXT_PUBLIC_APP_URL` reference lives in `src/lib/mailer.ts`,
which is imported only by API route handlers (`src/app/api/auth/*`,
`/propostas/[id]/send`). Never reaches a client component.

## Browser storage usage

Only one place uses client-side storage:

```
src/app/(auth)/login/page.tsx
  localStorage.getItem("olive-remember-email")
  localStorage.setItem("olive-remember-email", email)
  localStorage.removeItem("olive-remember-email")
```

What is stored: just the user's e-mail address when the "Lembrar de mim"
checkbox is checked (so the field is pre-filled on next visit). No
password, no token, no session ID. Acceptable.

## Cross-origin / SSRF surface

- All client `fetch` URLs are same-origin (relative `/api/...`). The
  browser sends them with the existing session cookie automatically.
- No client code accepts a user-controlled URL and calls `fetch` against
  it (no SSRF surface from the client).

## Notes on `/api/pdf`

The `/api/pdf` endpoint accepts arbitrary HTML from the authenticated
client and renders it via Puppeteer. This is documented behavior: the A4
preview sends the HTML it built locally so the server can render the
exact same document as a PDF.

- **Authentication:** `requireSession()` gates the call. Anonymous users
  cannot reach Puppeteer.
- **Same-origin:** the HTML lives in the user's own browser → their own
  org's data → no cross-tenant leak.
- **Self-XSS:** if the user pastes a `<script>` into the editor, it will
  execute when Puppeteer opens the page in a headless Chrome. This is
  isolated from other users (Puppeteer browser is single-shot per
  request). Documented earlier as a self-XSS-only finding.

## Conclusion

The frontend is a pure consumer of same-origin `/api/*` endpoints. There
are no API keys, no auth tokens, no third-party calls and no
server-only env vars in the client bundle. The only secret-shaped value
in browser storage is the remember-me email — not a credential.

Nothing actionable. No patches proposed.
