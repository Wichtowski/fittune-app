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

Locally the app runs on `http://fittune.local:4734` and talks to the API on `http://api-fittune.local:4733`.
Fixed, uncommon ports plus named hosts keep FitTune from colliding with other local apps that default to 3000, 5173 or 8080.
Vite uses `strictPort`, so a taken port fails at startup instead of quietly moving somewhere the API's CORS list does not allow.

Add both names to `/etc/hosts` once (needs `sudo`):

```text
127.0.0.1  fittune.local api-fittune.local
```

```bash
bun install
cp .env.example .env.local   # optional; .env.development already points at api-fittune.local:4733
bun run dev                  # http://fittune.local:4734 (run fittune-api on :4733)
```

The API must allow the app's origin: `FITTUNE_CORS_ORIGINS` in `fittune-api/.env` has to include `http://fittune.local:4734` (its `.env.example` does; update an older `.env` by hand).
`localhost:4734` still works for the app, but then use `http://localhost:4733` as `VITE_API_BASE_URL` in `.env.local`, because sessions and cached data are stored per origin.

| Command | What it does |
|---------|--------------|
| `bun run dev` | Vite dev server |
| `bun run build` | Type-check, then production build with the service worker and icons |
| `bun run preview` | Serve the production build |
| `bun run lint` / `bun run typecheck` / `bun run test` | ESLint, `tsc -b`, Vitest |

### Local fixtures

Sample accounts and months of history come from the API's `seed-dev` command, so every screen has something to show from the first start.
The fixtures live in the API's dedicated `fittune_dev` database and go through the real endpoints; the app has no fake backend or mock flows.
The API README ("Development fixtures") has the details and the guards that keep them out of production.

First run, with `fittune-api` checked out next to this repo:

```bash
cd ../fittune-api
cp .env.example .env    # sets FITTUNE_ENV=development and FITTUNE_FIXTURES_DATABASE_URL
make up && make seed    # Postgres + RustFS, then create, migrate and seed fittune_dev
make run-fixtures       # API on http://api-fittune.local:4733 against fittune_dev
cd ../fittune-app && bun run dev   # http://fittune.local:4734
```

`make fixtures` in this repo runs `make seed` in `../fittune-api` (set `FITTUNE_API_DIR` for another location).

Sign in with any of these; the dev-only password is `FitTune#Dev1`:

| Account | Try |
|---------|-----|
| `demo@fittune.test` | Dashboard, Progress (charts, muscle map, records), Workouts history with pages, exercise details such as Barbell Bench Press, routines and places |
| `casual@fittune.test` | Pounds and miles, and continuing a workout started on another device |
| `newbie@fittune.test` | First-run experience: no places, routines or history |
| `admin@fittune.test` | Profile → Admin panel → Invites with active, used, expired and revoked invites |

**Workout in progress.** The API holds an unfinished "Full Body A" for `casual`, as if it were started on a phone.
Like any server-side workout it does not restore itself into this browser: open the Workout tab and tap "Continue “Full Body A”".
That copies it into the local draft, and from then on the usual local-first flow applies (edits save locally, then sync with `PUT /workouts/{id}`).
The card only shows on the start screen, so finish or discard a workout already in progress in this browser first.
Rerunning `make seed` leaves the workout alone once the app has saved a newer revision of it.

**Reseeding and switching accounts.**

- `make seed` again refreshes the same records in place (dates move up to today). Account ids stay the same, so a signed-in session and cached data keep working; Profile → Offline data → Sync now refreshes the cache straight away.
- `make seed-reset` recreates only the fixture accounts; `make reset` recreates the whole fixture database. Both give the accounts new ids, so the old token stops working and the app signs out on its next request. Local workouts still waiting to sync belong to the old id and are dropped when you sign in again.
- Switch accounts with Profile → Sign out, which also clears the cached data and any local workout. Signing in as a different user on a device that still has another user's local workout discards that workout too.
- For a completely clean browser, clear the site data for `fittune.local:4734` (DevTools → Application → Storage). That removes the session, the persisted query cache, the local workout draft and outbox (`fittune.*` keys) and the service worker.

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
│   ├── places/        - saved workout locations and editable equipment presets
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

**Workout places.** Every new workout starts at a place (Home, Gym or a custom one), so the first workout asks the user to add one.
The start screen preselects the place of the latest workout, and the place can be changed during a workout.
Places list specific equipment (benches, racks, bars, each machine type), and every exercise lists everything it requires.
The exercise picker shows the exercises whose required equipment is all at the place, with an option to show everything; bodyweight exercises are always shown.
A user can keep up to 10 places, and creating, editing and archiving them requires a connection.
Cached places can be selected offline, and their immutable setup is saved with the workout draft and synced through the existing outbox.
Editing or archiving a place preserves past and active workout setups until the user explicitly selects a different version.
Changing places never removes exercises already in the workout.

**Offline and PWA.** The service worker precaches the app shell. When a new version is ready you
get an "Update" toast; the app never reloads itself in the middle of a workout. API responses
are cached per user by TanStack Query, never by the service worker.

**Progress photos.** After finishing a workout, the completion screen offers a skippable camera
or photo-library step. The workout is already saved before any photo upload. Photos can also be
added or deleted later on workout detail; the Progress page has a private gallery and two-photo
comparison. Uploads require a connection and a synced workout. A failed upload can be retried
while the page stays open, or the image can be selected again later. The API decodes and
re-encodes images to remove metadata and stores them privately in RustFS. Deploy the API's
progress-photo migration and RustFS service before deploying this app version.

**Offline data.** Opening the app online (at most every 15 minutes, and whenever the connection returns) downloads the profile, exercises, routines, places, records, the last 20 workouts and the history of their exercises into the persisted cache (`features/offline/sync.ts`).
Profile → Offline data shows when that last happened and has a "Sync now" button.
The app is offline when the device is, when the user turns on offline mode in Profile, or when the API stops answering (no response, or a 502-504 or Cloudflare 520-524 while online); `lib/connectivity.ts` feeds that into TanStack Query's online state, so queries, queued mutations and workout uploads pause together instead of retrying against a dead server.
While the API is down the app probes `GET /health` with growing gaps and goes back online by itself.
A banner explains which of the three it is and that logging keeps working, and screens without offline data say so instead of showing skeletons (`QueryFallback`).
Bump `CACHE_SCHEMA_VERSION` in `main.tsx` whenever a cached response shape changes; old caches are then dropped instead of breaking screens.

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

Exercise thumbnails and animated demos come from [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) and load while online.
They are © [Gym visual](https://gymvisual.com/) and are not covered by the dataset's MIT licence, so the app shows the credit the API returns with each file wherever the media appear: under the demo, the library and the exercise picker.
Three exercises without a counterpart in that dataset keep their photos from the [public domain Free Exercise DB](https://github.com/yuhonas/free-exercise-db/blob/a859101d633a01c4a1a920d6a8ce41dabba0705f/LICENSE.md).
The library is over 1,300 exercises, so its lists render a page at a time and its instruction texts load with each exercise instead of with the list.
Bodypart illustrations are bundled with the app and remain available offline.
The 2D muscle figure uses MIT-licensed [MuscleMap](https://github.com/melihcolpan/MuscleMap) geometry by Melih Colpan, with the licence in `public/licenses/muscle-map.txt`.
Regenerate it with `python3 scripts/anatomy/build-muscle-map.py`; the source revision is pinned in that script.
Exercise maps distinguish primary and secondary muscles; Progress shades actual working sets by primary muscle relative to the most trained group in the selected period.
Full-body sets count for every muscle group, while secondary effort and recovery are not estimated.
The optional 3D viewer continues to use BodyParts3D under CC BY 4.0.
Weekly streaks on Home and Progress use the existing API calculation: consecutive Monday-to-Sunday weeks with a completed workout or logged activity, in the device's time zone.
The current week stays open until Sunday ends, and the 12-week strip shows sessions per week independently of the selected Progress chart range.
YouTube exercise demos load only after the user taps Watch demo.
The Barbell Curl demo opens its original Vimeo page; the video is not copied into FitTune.

## Deployment

This client requires the matching `fittune-api` namespace changes from `feat/fithealth-namespaces` for FitHealth shell #27 (epic #26).
Training endpoints live under `/api/v1/train/*`, including `/api/v1/train/places`, while `/api/v1/health` is reserved for FitHealth.
Account and social endpoints stay flat under `/api/v1`; the server health check stays at `/health`.
Merge and deploy together, API first: old flat training endpoints are no longer supported.
Deploy the API's workout places migration before this client version.
Existing workouts and cached drafts without a place remain valid.

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
