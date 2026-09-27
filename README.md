# fittune-app

FitTune's client: a mobile-first fitness tracker (log workouts, runs and rides, check your
progress) that also works well on desktop for analytics, history and planning. It's an
installable PWA built to be wrapped with Capacitor later.

It talks to [`fittune-api`](https://github.com/wichtowski/fittune-api) only through the
HTTP contract documented in that repo's `docs/API.md`.

## Stack

TypeScript (strict) · React 19 · Vite · TanStack Router (file-based, typed search params) ·
TanStack Query (with a persisted cache) · Tailwind CSS 4 · shadcn/ui-style components on Radix ·
Zod · React Hook Form · vite-plugin-pwa (Workbox) · Recharts · Zustand (local workout state)

## Getting started

```bash
bun install
cp .env.example .env.local   # optional; .env.development already points at localhost:4733
bun run dev                  # http://localhost:5173 (run fittune-api on :4733)
```

| Command | What it does |
|---------|--------------|
| `bun run dev` | Vite dev server |
| `bun run build` | Type-check, then production build with the service worker and icons |
| `bun run preview` | Serve the production build |
| `bun run lint` / `bun run typecheck` / `bun run test` | ESLint, `tsc -b`, Vitest |

## Layout

```text
src/
├── routes/            - thin TanStack Router files (params, search validation, loaders)
│   ├── __root.tsx, login.tsx, register.tsx
│   └── _app/          - authenticated shell: dashboard, workout, workouts, routines,
│                        exercises, activity, progress, profile
├── features/          - product logic and UI by domain
│   ├── workouts/      - local-first workout draft, store, background sync, tracker UI
│   ├── exercises/     - library, search, custom exercises, per-exercise history
│   ├── routines/      - planning editor
│   ├── activity/      - quick log + optimistic mutations for runs/rides/…
│   ├── progress/      - range-scoped analytics and personal records
│   ├── analytics/     - shared chart kit (columns, trend line, bar list, stat tile)
│   ├── home/          - dashboard composition
│   ├── auth/          - session, sign-in/out
│   └── profile/       - profile, units, theme, password, account deletion
├── api/               - fetch client, typed endpoint functions, query options, query keys
├── schemas/           - Zod schemas shared by API parsing and forms
├── components/        - ui/ primitives (shadcn-style) and layout/ (shell, nav)
├── hooks/, lib/       - small cross-cutting helpers (units, formatting, storage, dates)
```

Routes stay thin; everything else lives in the feature that owns it.

## How the pieces fit

**Server state** goes through TanStack Query. All keys come from `api/query-keys.ts`, writes are
mutations that invalidate or update the right keys, and every API response is parsed with Zod
at the boundary. The query cache is persisted to storage, so history, exercises and stats stay
readable offline.

**Workout tracking is local-first.** An in-progress workout lives in a persisted Zustand store
(`features/workouts/store.ts`). Every tap (add set, change reps, tick a set, reorder, delete) is
a pure function in `draft.ts` that updates the UI straight away and bumps a `revision`.
`use-workout-sync.ts` uploads the latest full snapshot in the background with
`PUT /workouts/{id}`. That call is idempotent and revision-checked, so:

- retries and replays after bad gym Wi-Fi are always safe
- going offline pauses syncing (the indicator says so) without losing any data, even after a
  reload or when the app is killed
- workouts you finish offline wait in an outbox and upload once you're back online
- a `409` from another device is resolved by rebasing this device's revision on top

**Activities** use client-generated ids plus optimistic mutations. Paused offline writes are
persisted, then replayed when the app next starts.

**Offline and PWA.** The service worker precaches the app shell. When a new version is ready you
get an "Update" toast; the app never reloads itself in the middle of a workout. API responses
are cached per user by TanStack Query, never by the service worker.

**Responsive by composition.** On phones, a bottom tab bar with a central Workout button, bottom
sheets and big touch targets put doing the workout first. From `md` up there's a sidebar, and the
pages switch to denser compositions (history tables, side-by-side charts, a two-pane routine
editor) rather than stretched phone layouts.

**Capacitor readiness.** Auth uses a bearer token (no cookies), and all storage goes through
`lib/storage.ts`. Browser-only APIs (vibration, wake lock) are feature-detected, and the API URL
comes from `VITE_API_BASE_URL`. To add a native shell, swap the storage adapter for Capacitor
Preferences and point Capacitor at `dist/`.

## Design

The theme uses a dark graphite base with a volt accent for strength and an ember accent for
endurance. Tokens live in `src/styles.css` (light and dark), and training numbers use the
condensed display face. Chart colours are separate data tokens, checked for colour-blind
separation and contrast in both themes. Every chart has a table view.

Exercise photos come from the [public domain Free Exercise DB](https://github.com/yuhonas/free-exercise-db/blob/a859101d633a01c4a1a920d6a8ce41dabba0705f/LICENSE.md) at a pinned revision and load while online.
Bodypart illustrations are bundled with the app and remain available offline.
Exercise demos use YouTube embeds only after the user taps Watch demo.

## Deployment

The static build is served from the shared VPS by the platform-edge Caddy on
`fittune.oskarwichtowski.com`, which also sets the security headers and the SPA fallback.
Each release is unpacked into `/srv/fittune/static/releases/<tag>-<sha>` and the `current` symlink
is switched atomically; the five newest releases are kept for rollback.

| Workflow | What it does |
|----------|--------------|
| `ci.yml` | Lint, test, type-check and build on PRs and `main` |
| `create-release-tag.yml` | Tags every merge to `main` with the next `x.y.z` |
| `deploy-release.yml` | Run manually on a tag: validates it, then runs `deploy-frontend.yml` |
| `deploy-frontend.yml` | `bun run build` with `VITE_API_BASE_URL` / `VITE_APP_VERSION`, uploads to the VPS and switches `current` |

Secrets: `VITE_API_BASE_URL` (`https://api-fittune.oskarwichtowski.com`), `DEPLOY_HOST`,
`DEPLOY_USER`, `DEPLOY_SSH_KEY`. Add the app's origin to the API's `FITTUNE_CORS_ORIGINS`.
