# FitHealth shell: app switcher and FitHealth skeleton

Issue: #27, part of the FitHealth epic #26

## Intent

FitHealth is a Fitatu-style nutrition app that lives inside `fittune-app` next to FitTune (training).
Both apps share one account, one backend and one PWA install, but each has its own navigation and purpose.
This sub-project only makes room for FitHealth: the switcher, the remembered last-used app, a first-run launcher and an empty FitHealth section.
The food diary (#28), barcode scan (#29) and label OCR (#30) fill that section later.

Success means:

- Opening the app lands in the app used last, with no extra tap
- Switching between FitTune and FitHealth is always close at hand
- FitTune behaves exactly as today, including offline mode
- FitHealth is clearly online only and never shows broken or stale data

## Decisions

- `/` is only an entry point: it redirects to the last-used app, or shows a launcher on first run
- The FitTune dashboard moves from `/` to `/train`, all other FitTune routes keep their paths
- FitHealth lives under `/health`
- The last-used app is remembered per device, not per account
- Each route declares which app it belongs to through TanStack Router `staticData`, the app is never guessed from the URL
- FitHealth uses a teal accent, applied by re-scoping the `--primary` tokens
- On mobile the switcher is an app-mark button in `PageHeader` that opens a bottom sheet, on desktop it is a segmented control in the sidebar
- No combined dashboard
- The PWA `start_url` stays `/`, the installed app keeps the FitTune name and icon

## App model

New feature folder `src/features/apps/`:

- `apps.ts` exports `type AppId = "train" | "health"` and the metadata for each app: label, home route (`/train`, `/health`), description for the launcher, and its mobile and desktop nav items
- `store.ts` is a zustand `persist` store on `storage` from `src/lib/storage.ts` (same pattern as `src/features/offline/store.ts`), holding `lastApp: AppId | null` and `setLastApp`
- `use-active-app.ts` exports `useActiveApp()` and a pure `resolveActiveApp(matches, lastApp)`

Route ownership:

- `staticData: { app?: AppId }` is typed through module augmentation of `StaticDataRouteOption`
- The active app is the `app` of the deepest matched route that declares one, otherwise `lastApp`, otherwise `"train"`
- Shared pages such as `/profile` declare nothing, so they stay in whichever app the user came from
- `AppShell` calls `setLastApp` whenever the matched route declares an app, so using an app is what records the choice

## Routes

| Path | File | App | Notes |
| --- | --- | --- | --- |
| `/` | `src/routes/index.tsx` | none | Outside the shell. Redirects or renders the launcher |
| `/train` | `src/routes/_app/train.tsx` | train | The current dashboard, moved from `_app/index.tsx` |
| `/health` | `src/routes/_app/health.tsx` | health | Layout for all FitHealth pages, renders the online-only gate |
| `/health/` | `src/routes/_app/health/index.tsx` | inherited | Placeholder FitHealth home |
| existing FitTune routes | unchanged | train | One `staticData` line each |
| `/profile` | unchanged | none | Shared |

`/` behaviour, in `beforeLoad`:

1. Not authenticated: redirect to `/login` with the current location, same as `_app` does today
2. `lastApp` set: redirect with `replace` to that app's home
3. Otherwise render the launcher

The authentication check moves into one `requireAuth(location)` helper in `src/features/auth/session.ts`, used by both `/` and `_app`, so the two cannot drift.

Link updates:

- FitTune "Home" (mobile) and "Dashboard" (desktop) nav items point to `/train`
- The sidebar logo links to the active app's home
- Registration and the 404 "Back to home" link keep pointing to `/`, which now routes correctly on its own

## Shell UI

### Theming

- `AppShell` sets `data-app="train|health"` on its root element
- `src/styles.css` redefines `--primary`, `--primary-foreground` and `--primary-strong` under `[data-app="health"]`, in both light and dark themes, with a teal around hue 185
- Everything built on the primary tokens (buttons, active nav, focus rings) follows automatically, no component changes
- Surfaces, typography, radius and the `endurance` colour are unchanged, so both apps read as one product

### Switcher

- Desktop: the sidebar logo row becomes a two-option segmented control, `FitTune | FitHealth`, one click to switch
- Mobile: `PageHeader` renders a small app-mark button on top-level screens, meaning when no `back` element is passed
- Tapping it opens a `vaul` bottom sheet listing both apps with the current one checked, picking one navigates to its home
- Detail screens show no switcher, the user goes back first

### Navigation

- `src/components/layout/nav-items.ts` is replaced by the per-app nav in `apps.ts`
- `BottomNav` and `Sidebar` read the nav of the active app
- `BottomNav` sets its column count from the number of items instead of the fixed `grid-cols-5`
- FitHealth nav for now: mobile has Today (`/health`) and Profile, desktop has a "Nutrition" group with Today
- The sidebar primary action is per app: FitTune keeps "Start workout", FitHealth has none until the scan exists (#29)
- `ActiveWorkoutBar`, `SyncIndicator` and the profile block stay visible in both apps, so a running workout is never hidden

### Logo

- `Logo` takes an `app` prop
- FitHealth uses the same dark rounded tile with a leaf glyph in teal and the "FitHealth" wordmark

### Launcher

- Full screen, no navigation
- FitTune logo, a heading and two large tiles with mark, name and one line each:
  - FitTune: training, workouts, routines, progress
  - FitHealth: nutrition, food diary, product scanning
- Tapping a tile navigates to that app's home, which records `lastApp`
- All copy goes through `t()` with Polish strings added to `src/lib/pl.ts`

## Online only

- The `/health` layout renders an `OnlineOnly` gate around its `Outlet`
- When `useOffline().offline` is true the gate shows a full-page state instead of the page:
  - `device`: FitHealth needs a connection
  - `manual`: the same, plus the existing "Turn it off in Profile" link
  - `server`: FitHealth's servers are unavailable right now
- The page renders again on its own once the connectivity store reports online, including after the existing API health probe succeeds
- `ConnectionBanner` is not rendered while the active app is FitHealth, its copy about workouts saved on the device does not apply there
- `shouldPersistQuery` in `src/lib/query-client.ts` also excludes query keys starting with `"health"`, so FitHealth data never lands in the offline cache
- The service worker still serves the app shell, so `/health` opens offline and shows the gate instead of a browser error
- `src/features/offline/sync.ts` keeps downloading FitTune data only

## Out of scope

- Any backend change
- FitHealth features: diary, products, scan, OCR
- Syncing the remembered app to the user account
- A combined training and nutrition dashboard
- A separate PWA name or icon for FitHealth

## Testing

Unit and component tests with Vitest and Testing Library, next to the code like the existing `*.test.tsx` files:

- `resolveActiveApp`: route tag wins over `lastApp`, `lastApp` wins over the `"train"` default
- `AppShell` records `lastApp` on a tagged route and leaves it alone on `/profile`
- Routing with a memory-history router on the real route tree:
  - `/` renders the launcher when nothing is remembered
  - `/` redirects to `/health` or `/train` when an app is remembered
  - `/` redirects an unauthenticated user to `/login`
- `OnlineOnly` shows the right copy for each offline reason and renders its children when online
- The switcher sheet navigates to the picked app's home
- `BottomNav` renders the active app's items
- `shouldPersistQuery` rejects `"health"` keys

Checks: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`.

Manual verification in the real app with Playwright at a phone and a desktop viewport, in light and dark themes:

- First run shows the launcher, picking an app opens it
- Switching both ways from every top-level screen
- Reloading `/` lands in the last-used app
- FitHealth offline (device and manual offline mode) shows the gate, FitTune keeps working as today
