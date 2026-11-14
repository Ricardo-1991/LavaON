    # CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Lava On is a booking PWA for car washes (lava-jatos), written in React DOM + TypeScript + Vite. UI text, docs and error messages are in Brazilian Portuguese. Despite `AGENTS.md`, `app.json`, `eas.json` and `.expo/`, the project **no longer uses Expo/React Native** — those files are historical reference only and do not participate in the build.

## Commands

Node 24.x, npm.

```bash
npm run dev            # Vite on 0.0.0.0 (proxies /api to 127.0.0.1:3001, override with LAVA_API_TARGET)
npm run dev:api        # local Node API server (server/local.ts) on port 3001, reads .env.local
npm run db:migrate     # apply PostgreSQL schema (needs admin DATABASE_URL)
npm run build          # tsc --noEmit && vite build -> dist/
npm run typecheck
npm run lint
npm run format:check   # prettier
npm test               # vitest (jsdom): src/**/*.test.ts(x) and tests/unit/**
npm run test:server    # vitest node config: tests/server/** (needs TEST_DATABASE_URL)
npm run test:e2e       # Playwright, demo mode, builds + previews on :4173 (chromium/firefox/webkit)
npm run test:e2e:shared  # Playwright against shared mode (needs TEST_DATABASE_URL)
```

Single test: `npx vitest run path/to/file.test.ts -t "test name"` (add `--config vitest.server.config.ts` for `tests/server`); `npx playwright test tests/e2e/flows.spec.ts --project=chromium -g "name"`.

Server and shared-e2e tests **wipe the database**. Their configs refuse anything other than a local (`127.0.0.1`/`localhost`) database named `lavaon_test`:

```bash
docker run --name lava-on-test-postgres -e POSTGRES_PASSWORD=lavaon-local-test -e POSTGRES_DB=lavaon_test -p 127.0.0.1:55432:5432 -d postgres:17-alpine
export TEST_DATABASE_URL=postgresql://postgres:lavaon-local-test@127.0.0.1:55432/lavaon_test
```

## Architecture

### Two data modes, one set of rules

The data mode is chosen **at build time** by `VITE_DATA_MODE` (`src/data/repositories/index.ts`):

- **Demo (default)**: everything runs in the browser against IndexedDB (`lava-on-demo` DB, store `state`, key `database`, `schemaVersion: 1`). Auth is simulated (`joao@lavaon.com.br` / `demo`). Works offline.
- **Shared (`VITE_DATA_MODE=server`)**: the client's repositories are a `Proxy` that POSTs `{ op: "group.method", args }` to `/api/app`. No offline write queue; server failures never fall back to demo data.

The key design point: business logic lives once in `src/data/repositories/create-repositories.ts` (a factory over a `StateDatabase` with `read`/`write`) plus pure rules in `src/domain/rules/`. **The server reuses the same factory**: `server/application.ts#ownerRequest` loads the owner's whole state document from PostgreSQL inside a transaction (row-locked), wraps it as a `StateDatabase`, invokes the requested repository method, and saves the document if it changed. So changing a repository method changes both modes.

Consequences when editing:
- Code under `src/domain` and `src/data/repositories/create-repositories.ts` is imported by Node server code, so it uses **relative imports with `.js` extensions**, not the `@/` alias, and must not touch browser-only APIs.
- A new owner operation must be added to the allowlist/Zod schemas in `server/validation.ts` (`ownerOperation`), otherwise the server rejects it. The client `apiRequest` treats any op not matching the read-only regex (`getSession|getById|list|getRange|getDay|getSummary|getOperatingDays`) as a write (blocks PWA updates while in flight).
- Contracts are in `src/domain/contracts/repositories.ts`; errors are `AppError` with codes from `src/domain/errors.ts`, which `server/http.ts` maps to HTTP responses.

### Server (shared mode)

- `api/app.ts` (Vercel function) → `server/http.ts#handleRequest`: origin/content-type checks, rate limiting, then dispatch to `authenticate` (signIn/signUp), `ownerRequest`, public schedule (`GET /api/app?establishment=`) or public booking. `server/local.ts` serves the same handler for local dev.
- PostgreSQL stores one versioned JSON document per owner plus auxiliary tables (`lava_sessions`, `lava_public_links`, `lava_booking_requests` for idempotency, rate limits). Every mutation, including public bookings, locks the owner's row until commit to prevent overbooking.
- Runtime uses restricted `LAVA_DATABASE_URL`; migrations/ops scripts use admin `DATABASE_URL`/`POSTGRES_URL` in a separate process. Never prefix secrets with `VITE_`.
- `api/maintenance.ts` is a daily Vercel cron (`CRON_SECRET` bearer) that cleans expired security records. `server/bot-protection.ts` integrates Vercel BotID (enabled in the Vercel build via `VITE_BOT_PROTECTION=on`).
- Ops scripts (`scripts/recover-owner.ts`, `scripts/backup.ts`, `scripts/provision-runtime.ts`) are run with `node --env-file=<private file> --import tsx ...`; see `docs/security-operations.md`.

### Frontend

- `src/app` (router/navigation), `src/features/<area>/{screens,components}`, `src/shared` (theme tokens, UI kit, utils), CSS Modules. Layout is mobile-first, max width 480 px centered.
- Forms: React Hook Form + Zod. Data: TanStack Query hooks in `src/data/query/hooks.ts`.
- `/book/:establishmentId` is the public client booking route and must work without an owner session.
- PWA via `vite-plugin-pwa` (prompt-type updates). `/api/` is excluded from the SW cache. `src/pwa/activity.ts` tracks in-flight writes and dirty forms to block/confirm reloads on update.

### Domain rules worth knowing

- One reservation = one vehicle, one service, one daily slot; slots are shared across the day's services. Pending/confirmed/completed consume capacity; cancelled/refused/no-show don't.
- Only explicitly published dates (`scheduleDays`) are bookable publicly; weekly operating days are only suggestions. Creating a period (1 or 7 days) is atomic.
- Money in cents, dates as `YYYY-MM-DD`, default timezone `America/Sao_Paulo`.

More detail: `docs/architecture.md`, `docs/shared-booking.md`, `docs/hosting.md`, `docs/security-operations.md`, `docs/validation.md`.
