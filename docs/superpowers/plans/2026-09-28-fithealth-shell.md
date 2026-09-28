# FitHealth Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make room for FitHealth next to FitTune: API and clients split by app, `/` opening the last-used app, a first-run launcher, a switcher in the shell, and an online-only FitHealth skeleton.

**Architecture:** `fittune-api` nests training routes under `/api/v1/train` and an empty `/api/v1/health`, account and social routes stay flat.
`fittune-app` replaces the global `request()` with an abstract `ApiClient` and three instances (`account`, `fittune`, `fithealth`), declares the owning app on each route through TanStack Router `staticData`, and derives navigation, theming and the switcher from the active app.

**Tech Stack:** Rust (axum 0.8, sqlx, `#[sqlx::test]`), React 19, TanStack Router and Query, zustand, Tailwind 4, vaul, Vitest and Testing Library, bun.

**Spec:** `fittune-app/docs/superpowers/specs/2026-09-28-fithealth-shell-design.md`

## Global Constraints

- Never use the em dash character, use a plain dash
- Code comments have no trailing dot
- Commit messages are short and human, no AI attribution or co-author lines
- No new dependencies
- Backward compatibility is not kept: old flat training paths must return `404`
- `fittune-api` work happens on branch `feat/fithealth-namespaces`, `fittune-app` work on `feat/fithealth-shell` (already exists, holds the spec)
- All user-facing strings go through `t()` and get a Polish entry in `src/lib/pl.ts` in the same task
- Brand names `FitTune` and `FitHealth` are never translated
- FitHealth accent is teal around hue 185, applied only by redefining `--primary`, `--primary-foreground` and `--primary-strong`
- The server health check stays at `GET /health`
- App checks: `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`
- API checks: `cargo fmt --check`, `cargo clippy --all-targets --all-features --locked -- -D warnings`, `cargo test --all-targets --all-features --locked` (needs `DATABASE_URL`, see `.env.example`)

## Review Focus

- A persisted `lastApp` with a value the app no longer knows (for example an old build wrote `"nutrition"`): `/` must fall back to the launcher, not crash or redirect to `undefined`. Test in Task 3
- Signed-out visitor opening `/` with a remembered app: must land on `/login`, never on a FitHealth or FitTune page. Test in Task 3
- Shared page `/profile` reached from FitHealth: must keep FitHealth navigation and must not overwrite `lastApp`. Test in Task 5
- Offline while on a shared page after using FitHealth: FitTune's connection banner must still show, the FitHealth gate must not. Test in Task 4
- A 401 on a `fithealth` or `fittune` request must sign out exactly like one on `account`, since all three share one session. Test in Task 2

---

## File Structure

`fittune-api`:

- Create `src/train/mod.rs`: composes the FitTune router from existing modules
- Create `src/health/mod.rs`: FitHealth router, empty for now
- Modify `src/lib.rs`: declare `train` and `health`
- Modify `src/app.rs`: nest the two namespaces, rename the `health` handler to `health_check`
- Modify `src/exercises/media.rs`: file URLs under `/api/v1/train`
- Modify `tests/api/*.rs`, `src/fixtures/seed.rs`, `docs/API.md`, `README.md`: new paths
- Create `tests/api/namespaces.rs`: namespace behaviour

`fittune-app`:

- Create `src/api/transport.ts`: `send`, `ApiError`, auth hooks, timeouts (moved from `client.ts`)
- Rewrite `src/api/client.ts`: abstract `ApiClient`, re-exports
- Create `src/api/account.ts`, `src/api/fittune.ts`, `src/api/fithealth.ts`: client classes and instances
- Create `src/schemas/photo.ts`: progress photo schema (moved from `src/api/photos.ts`)
- Delete `src/api/photos.ts`, `src/api/reachability.ts` stays untouched
- Modify query modules `src/api/{auth,exercises,friends,invites,routines,places,workouts,activities,stats}.ts`: keep only query options, call the clients
- Create `src/features/apps/apps.ts`, `store.ts`, `use-active-app.ts`, `components/{app-mark,launcher,app-segmented-switch,app-switcher-sheet}.tsx`
- Create `src/features/health/components/{health-home,online-only}.tsx`
- Create `src/routes/index.tsx`, `src/routes/_app/train.tsx`, `src/routes/_app/health.tsx`, `src/routes/_app/health/index.tsx`; delete `src/routes/_app/index.tsx`
- Create `src/test/router.tsx`: test helper that renders UI inside a memory router
- Modify `src/components/layout/{app-shell,bottom-nav,sidebar,logo,page-header}.tsx`; delete `nav-items.ts`
- Modify `src/styles.css`, `src/lib/query-client.ts`, `src/features/auth/session.ts`, `src/lib/pl.ts`

---

### Task 1: Namespace the API by app (`fittune-api`)

**Files:**
- Create: `src/train/mod.rs`, `src/health/mod.rs`, `tests/api/namespaces.rs`
- Modify: `src/lib.rs`, `src/app.rs:21-24,69-83,105-108,131`, `src/exercises/media.rs:71`, `tests/api/main.rs`, every `tests/api/*.rs`, `src/fixtures/seed.rs`, `docs/API.md`, `README.md`

**Interfaces:**
- Produces: HTTP paths `/api/v1/train/{exercises,exercise-media,routines,places,workouts,progress-photos,activities,stats}...` and `/api/v1/health/...`; account paths unchanged

- [ ] **Step 1: Create the branch**

```bash
cd fittune-api && git checkout main && git pull --ff-only && git checkout -b feat/fithealth-namespaces
```

- [ ] **Step 2: Write the failing namespace tests**

Create `tests/api/namespaces.rs`:

```rust
use axum::http::{Method, StatusCode};
use sqlx::PgPool;

use crate::common::TestApp;

#[sqlx::test(migrator = "fittune_api::db::MIGRATOR")]
async fn training_endpoints_live_under_train(pool: PgPool) {
    let app = TestApp::new(pool);
    let user = app.register("namespaced").await;

    let (status, _) = app.get("/api/v1/train/routines", &user.token).await;
    assert_eq!(status, StatusCode::OK);

    // No backward compatibility: the flat path is gone
    let (status, body) = app.get("/api/v1/routines", &user.token).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(body["code"], "not_found");
}

#[sqlx::test(migrator = "fittune_api::db::MIGRATOR")]
async fn account_endpoints_stay_shared(pool: PgPool) {
    let app = TestApp::new(pool);
    let user = app.register("shared").await;

    let (status, _) = app.get("/api/v1/me", &user.token).await;
    assert_eq!(status, StatusCode::OK);
    let (status, _) = app.get("/api/v1/train/me", &user.token).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[sqlx::test(migrator = "fittune_api::db::MIGRATOR")]
async fn unknown_health_routes_return_the_json_not_found_error(pool: PgPool) {
    let app = TestApp::new(pool);
    let user = app.register("nutrition").await;

    let (status, body) = app
        .request(Method::GET, "/api/v1/health/anything", Some(&user.token), None)
        .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(body["code"], "not_found");
}
```

Add `mod namespaces;` to `tests/api/main.rs` in alphabetical order (after `mod invites;`).
Check the `register`, `get` and `request` helper signatures in `tests/api/common.rs` first and match them exactly (`register(&str) -> TestUser`, `get(&str, &str) -> (StatusCode, Value)`, `request(Method, &str, Option<&str>, Option<Value>)`); adjust the calls above only if they differ.

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cargo test --test api namespaces`
Expected: FAIL, `training_endpoints_live_under_train` gets `404` on `/api/v1/train/routines`

- [ ] **Step 4: Add the namespace routers**

Create `src/train/mod.rs`:

```rust
//! FitTune: training endpoints, mounted under `/api/v1/train`

use axum::Router;

use crate::{
    AppState, activities, exercises, photos, places, routines, stats, workouts,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .merge(exercises::router())
        .merge(exercises::media::router())
        .merge(routines::router())
        .merge(places::router())
        .merge(workouts::router())
        .merge(photos::router())
        .merge(activities::router())
        .merge(stats::router())
}
```

Create `src/health/mod.rs`:

```rust
//! FitHealth: nutrition endpoints, mounted under `/api/v1/health`. Empty until the food diary
//! lands; unknown paths fall through to the API's JSON not found error

use axum::Router;

use crate::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
}
```

In `src/lib.rs` add `pub mod health;` after `pub mod friends;` and `pub mod train;` after `pub mod stats;`, and change the crate doc line to:

```rust
//! FitTune API: training (FitTune) and nutrition (FitHealth) behind one account.
```

In `src/app.rs`:

1. Replace the `use crate::{...}` block with:

```rust
use crate::{
    auth, config::Config, error::ApiError, friends, health, invites, rate_limit::RateLimiter,
    train, users,
};
```

2. Replace the `api` router with:

```rust
    let api = Router::new()
        .nest("/auth", auth::router())
        .merge(users::router())
        .merge(invites::router())
        .merge(friends::router())
        .nest("/train", train::router())
        .nest("/health", health::router())
        .fallback(|| async { ApiError::NotFound("route") });
```

3. Rename the handler `async fn health(` to `async fn health_check(` and the route to `.route("/health", get(health_check))`, so the handler no longer shares a name with the `health` module.

If `photos::PhotoStore` or other items from the removed imports are still used in `app.rs` (for example `AppState` holds `photos`), keep importing them by their full path, `cargo build` will name any that are missing.

- [ ] **Step 5: Move server-built media URLs**

In `src/exercises/media.rs` change the URL line to:

```rust
            .then(|| format!("/api/v1/train/exercise-media/{}/file", row.id));
```

- [ ] **Step 6: Move every client of the old paths**

```bash
sed -i -E 's#/api/v1/(exercises|exercise-media|routines|places|workouts|progress-photos|activities|stats)#/api/v1/train/\1#g' \
  $(ls tests/api/*.rs | grep -v namespaces.rs) src/fixtures/seed.rs docs/API.md README.md
git diff --stat
```

`tests/api/namespaces.rs` is excluded on purpose, its flat `/api/v1/routines` must stay flat.
Past design docs in `docs/superpowers/specs/` are records of earlier decisions and keep their old paths.
Check `tests/api/auth.rs` still uses `/api/v1/nope` (untouched) and that no `/api/v1/train/train/` appears: `grep -rn "train/train" tests src docs README.md` must print nothing.

- [ ] **Step 7: Document the namespaces**

In `docs/API.md`, under the intro paragraph, add:

```markdown
## Namespaces

- Account and social endpoints are shared by both apps and live directly under `/api/v1`: `auth`, `me`, `users`, `admin/invites`, `friends`, `blocks`
- FitTune (training) endpoints live under `/api/v1/train`
- FitHealth (nutrition) endpoints live under `/api/v1/health`
```

- [ ] **Step 8: Run all API checks**

Run: `cargo fmt --check && cargo clippy --all-targets --all-features --locked -- -D warnings && cargo test --all-targets --all-features --locked`
Expected: all pass, including the three `namespaces` tests and `health_reports_database_status`

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "Namespace training routes under /train and add an empty /health"
```

---

### Task 2: API clients per app (`fittune-app`)

**Files:**
- Create: `src/api/transport.ts`, `src/api/transport.test.ts`, `src/api/account.ts`, `src/api/fittune.ts`, `src/api/fithealth.ts`, `src/schemas/photo.ts`
- Rewrite: `src/api/client.ts`, `src/api/client.test.ts`
- Delete: `src/api/photos.ts`
- Modify: `src/api/{auth,exercises,friends,invites,routines,places,workouts,activities,stats,mutation-defaults}.ts`, the call sites listed in Step 7, `src/features/offline/sync.test.ts`, `src/features/offline/use-offline-sync.test.ts`, `src/features/friends/components/sharing-settings.test.tsx`

**Interfaces:**
- Produces: `abstract class ApiClient` (`src/api/client.ts`) with `protected request(path, options)`, `protected url(path): string`, `protected token(): string | null`, `protected unauthorized(): void`
- Produces: `send(path, options)` in `src/api/transport.ts`, only called by `ApiClient`, mocked in tests
- Produces: instances `account`, `fittune`, `fithealth` with the methods below; `ApiError`, `REQUEST_TIMEOUT_MS`, `configureApiClient` still exported from `@/api/client`

- [ ] **Step 1: Switch to the app branch**

```bash
cd fittune-app && git checkout feat/fithealth-shell
```

- [ ] **Step 2: Move the transport into its own module**

Create `src/api/transport.ts` with the full current contents of `src/api/client.ts`, then:

1. Rename `export async function request<` to `export async function send<`, and change its URL line to use `apiUrl`:

```ts
  const url = new URL(apiUrl(path));
```

2. Export the options type by changing `type RequestOptions` to `export type RequestOptions`
3. Add below `reportUnauthorized`:

```ts
/** The token of the signed-in session, shared by every client */
export function authToken() {
  return hooks.getToken();
}

/** Absolute URL of an API path, `path` already carries its namespace */
export function apiUrl(path: string) {
  return `${API_BASE_URL}/api/v1${path}`;
}
```

4. Add a module comment at the top, after the imports:

```ts
/**
 * Raw HTTP to fittune-api. Only `ApiClient` calls `send`, feature code goes through the
 * `account`, `fittune` and `fithealth` clients so every call names its namespace. Kept apart
 * from `client.ts` so tests can mock `send`
 */
```

Move `src/api/client.test.ts` to `src/api/transport.test.ts` and in it replace `import { REQUEST_TIMEOUT_MS, request } from "./client";` with `import { REQUEST_TIMEOUT_MS, send } from "./transport";` and both `request("/me"` calls with `send("/me"`.

- [ ] **Step 3: Write the failing client tests**

Create a new `src/api/client.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { account } from "./account";
import { configureApiClient } from "./client";
import { fittune } from "./fittune";
import { API_BASE_URL } from "@/lib/env";

const onUnauthorized = vi.fn();

function answer(status: number, body: unknown) {
  return vi.fn((_url: URL, _init?: RequestInit) => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

beforeEach(() => {
  configureApiClient({ getToken: () => "token-1", onUnauthorized });
});

afterEach(() => {
  vi.unstubAllGlobals();
  onUnauthorized.mockReset();
  configureApiClient({ getToken: () => null, onUnauthorized: () => {} });
});

describe("ApiClient", () => {
  it("sends training calls under /train and account calls at the root", async () => {
    const fetch = answer(200, []);
    vi.stubGlobal("fetch", fetch);

    await fittune.getRoutines();
    await account.getBlocks();

    expect(String(fetch.mock.calls[0]?.[0])).toBe(`${API_BASE_URL}/api/v1/train/routines`);
    expect(String(fetch.mock.calls[1]?.[0])).toBe(`${API_BASE_URL}/api/v1/blocks`);
  });

  it("uses the one shared session for every client", async () => {
    const fetch = answer(200, []);
    vi.stubGlobal("fetch", fetch);

    await fittune.getPlaces();

    const headers = fetch.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-1");
  });

  it("signs out on a 401 from a training call like from an account call", async () => {
    vi.stubGlobal("fetch", answer(401, { code: "unauthorized", message: "Session expired" }));

    await expect(fittune.getRoutines()).rejects.toMatchObject({ status: 401 });
    await expect(account.getBlocks()).rejects.toMatchObject({ status: 401 });

    expect(onUnauthorized).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 4: Run them to verify they fail**

Run: `bun run test src/api/client.test.ts`
Expected: FAIL, cannot resolve `./account`

- [ ] **Step 5: Write the base class and the three clients**

Replace `src/api/client.ts` with:

```ts
import type { z } from "zod";

import { apiUrl, authToken, type RequestOptions, reportUnauthorized, send } from "./transport";

export { ApiError, configureApiClient, REQUEST_TIMEOUT_MS } from "./transport";

/** Where a client's endpoints live under `/api/v1`: shared account routes or one app's */
export type ApiNamespace = "" | "/train" | "/health";

/**
 * Base for the per-app clients. It owns the namespace and nothing else, the transport and the
 * shared session live in `transport.ts`
 */
export abstract class ApiClient {
  protected constructor(private readonly namespace: ApiNamespace) {}

  protected request<T extends z.ZodType | undefined = undefined>(path: string, options: RequestOptions<T> = {}) {
    return send(`${this.namespace}${path}`, options);
  }

  /** For uploads and downloads that need XHR or a raw `fetch` */
  protected url(path: string) {
    return apiUrl(`${this.namespace}${path}`);
  }

  protected token() {
    return authToken();
  }

  protected unauthorized() {
    reportUnauthorized();
  }
}
```

Create `src/schemas/photo.ts`:

```ts
import { z } from "zod";

export const progressPhotoSchema = z.object({
  id: z.guid(),
  workout_id: z.guid().nullable(),
  width: z.number(),
  height: z.number(),
  bytes: z.number(),
  taken_at: z.iso.datetime(),
  created_at: z.iso.datetime(),
});
export type ProgressPhoto = z.infer<typeof progressPhotoSchema>;
```

Create `src/api/account.ts`:

```ts
import { z } from "zod";

import { ApiClient } from "./client";
import {
  blockedUserSchema,
  feedPageSchema,
  friendRequestsSchema,
  friendSchema,
  type Sharing,
  sharingSchema,
  userWithRelationshipSchema,
} from "@/schemas/friend";
import { createdInviteSchema, type InviteInput, inviteSchema } from "@/schemas/invite";
import { exerciseRecordSchema, overviewSchema, type Period } from "@/schemas/stats";
import {
  authResponseSchema,
  type LoginInput,
  type ProfileUpdate,
  type RegisterInput,
  userSchema,
} from "@/schemas/user";

/**
 * Account and social endpoints, shared by FitTune and FitHealth. Methods are arrow fields so
 * they can be passed straight to `mutationFn`
 */
class AccountClient extends ApiClient {
  constructor() {
    super("");
  }

  // Session and profile
  login = (input: LoginInput) =>
    this.request("/auth/login", { method: "POST", body: input, schema: authResponseSchema, anonymous: true });
  register = (input: RegisterInput) =>
    this.request("/auth/register", { method: "POST", body: input, schema: authResponseSchema, anonymous: true });
  logout = () => this.request("/auth/logout", { method: "POST" });
  getMe = (signal?: AbortSignal) => this.request("/me", { schema: userSchema, signal });
  updateProfile = (update: ProfileUpdate) => this.request("/me", { method: "PATCH", body: update, schema: userSchema });
  changePassword = (body: { current_password: string; new_password: string }) =>
    this.request("/me/password", { method: "POST", body });
  deleteAccount = (password: string) => this.request("/me", { method: "DELETE", body: { password } });
  listUsers = () => this.request("/users", { schema: z.array(userSchema) });

  // Invites (admin)
  getInvites = (signal?: AbortSignal) => this.request("/admin/invites", { schema: inviteSchema.array(), signal });
  createInvite = (input: InviteInput) =>
    this.request("/admin/invites", {
      method: "POST",
      body: { ...input, note: input.note || null },
      schema: createdInviteSchema,
    });
  revokeInvite = (id: string) => this.request(`/admin/invites/${id}`, { method: "DELETE" });

  // Friends, blocks and sharing
  getFriends = (signal?: AbortSignal) => this.request("/friends", { schema: z.array(friendSchema), signal });
  getFriendRequests = (signal?: AbortSignal) => this.request("/friends/requests", { schema: friendRequestsSchema, signal });
  getBlocks = (signal?: AbortSignal) => this.request("/blocks", { schema: z.array(blockedUserSchema), signal });
  getSharing = (signal?: AbortSignal) => this.request("/me/sharing", { schema: sharingSchema, signal });
  lookupUser = (username: string, signal?: AbortSignal) =>
    this.request("/users/lookup", { schema: userWithRelationshipSchema, query: { username }, signal });
  /** Every friend's shared sessions, or one friend's when `userId` is given */
  getFriendFeed = (userId: string | undefined, cursor: string | undefined, signal?: AbortSignal) =>
    this.request(userId ? `/friends/${userId}/feed` : "/friends/feed", {
      schema: feedPageSchema,
      query: { cursor, limit: 20 },
      signal,
    });
  getFriend = (userId: string, signal?: AbortSignal) => this.request(`/friends/${userId}`, { schema: friendSchema, signal });
  getFriendOverview = (userId: string, period: Period, tz: string, signal?: AbortSignal) =>
    this.request(`/friends/${userId}/stats/overview`, { schema: overviewSchema, query: { ...period, tz }, signal });
  getFriendRecords = (userId: string, signal?: AbortSignal) =>
    this.request(`/friends/${userId}/records`, { schema: z.array(exerciseRecordSchema), signal });
  sendFriendRequest = (username: string) =>
    this.request("/friends/requests", { method: "POST", body: { username }, schema: userWithRelationshipSchema });
  acceptFriendRequest = (userId: string) =>
    this.request(`/friends/requests/${userId}/accept`, { method: "POST", schema: friendSchema });
  /** Declines an incoming request or cancels an outgoing one */
  deleteFriendRequest = (userId: string) => this.request(`/friends/requests/${userId}`, { method: "DELETE" });
  removeFriend = (userId: string) => this.request(`/friends/${userId}`, { method: "DELETE" });
  blockUser = (userId: string) => this.request(`/blocks/${userId}`, { method: "PUT" });
  unblockUser = (userId: string) => this.request(`/blocks/${userId}`, { method: "DELETE" });
  updateSharing = (sharing: Sharing) => this.request("/me/sharing", { method: "PUT", body: sharing, schema: sharingSchema });
}

export const account = new AccountClient();
```

Create `src/api/fittune.ts`:

```ts
import { z } from "zod";

import { ApiClient, ApiError } from "./client";
import { reportNoResponse, reportResponse } from "@/lib/connectivity";
import { type ActivityInput, activitySchema } from "@/schemas/activity";
import { type ActivityKind, pageSchema } from "@/schemas/common";
import { exerciseHistorySchema, type ExerciseInput, exerciseSchema } from "@/schemas/exercise";
import { type ProgressPhoto, progressPhotoSchema } from "@/schemas/photo";
import { type PlaceInput, placeSchema } from "@/schemas/place";
import { type RoutineInput, routineSchema } from "@/schemas/routine";
import {
  type Bucket,
  exerciseRecordSchema,
  muscleVolumeSchema,
  overviewSchema,
  type Period,
  timelinePointSchema,
} from "@/schemas/stats";
import { type WorkoutInput, workoutSchema, workoutSummarySchema } from "@/schemas/workout";

const workoutPageSchema = pageSchema(workoutSummarySchema);
const activityPageSchema = pageSchema(activitySchema);

/** FitTune training endpoints under `/api/v1/train`. Arrow fields so they work as `mutationFn` */
class FitTuneClient extends ApiClient {
  constructor() {
    super("/train");
  }

  // Exercises
  getExercises = (signal?: AbortSignal) => this.request("/exercises", { schema: z.array(exerciseSchema), signal });
  getExercise = (id: string, signal?: AbortSignal) => this.request(`/exercises/${id}`, { schema: exerciseSchema, signal });
  getExerciseHistory = (id: string, signal?: AbortSignal) =>
    this.request(`/exercises/${id}/history`, { schema: exerciseHistorySchema, query: { sessions: 50 }, signal });
  createExercise = (input: ExerciseInput) =>
    this.request("/exercises", { method: "POST", body: input, schema: exerciseSchema });
  updateExercise = (id: string, input: ExerciseInput) =>
    this.request(`/exercises/${id}`, { method: "PUT", body: input, schema: exerciseSchema });
  archiveExercise = (id: string) => this.request(`/exercises/${id}`, { method: "DELETE" });

  // Routines
  getRoutines = (signal?: AbortSignal) => this.request("/routines", { schema: z.array(routineSchema), signal });
  getRoutine = (id: string, signal?: AbortSignal) => this.request(`/routines/${id}`, { schema: routineSchema, signal });
  createRoutine = (input: RoutineInput) => this.request("/routines", { method: "POST", body: input, schema: routineSchema });
  updateRoutine = (id: string, input: RoutineInput) =>
    this.request(`/routines/${id}`, { method: "PUT", body: input, schema: routineSchema });
  deleteRoutine = (id: string) => this.request(`/routines/${id}`, { method: "DELETE" });

  // Places
  getPlaces = (signal?: AbortSignal) => this.request("/places", { schema: placeSchema.array(), signal });
  savePlace = (id: string, input: PlaceInput) =>
    this.request(`/places/${id}`, { method: "PUT", body: input, schema: placeSchema });
  archivePlace = (id: string) => this.request(`/places/${id}`, { method: "DELETE" });

  // Workouts
  getWorkoutsPage = (status?: "in_progress" | "completed", cursor?: string, signal?: AbortSignal) =>
    this.request("/workouts", { schema: workoutPageSchema, query: { status, cursor, limit: 20 }, signal });
  getWorkout = (id: string, signal?: AbortSignal) => this.request(`/workouts/${id}`, { schema: workoutSchema, signal });
  putWorkout = (id: string, input: WorkoutInput) =>
    this.request(`/workouts/${id}`, { method: "PUT", body: input, schema: workoutSchema });
  deleteWorkout = (id: string) => this.request(`/workouts/${id}`, { method: "DELETE" });

  // Activities
  getActivitiesPage = (kind: ActivityKind | undefined, cursor: string | undefined, signal?: AbortSignal) =>
    this.request("/activities", { schema: activityPageSchema, query: { kind, cursor, limit: 20 }, signal });
  putActivity = (id: string, input: ActivityInput) =>
    this.request(`/activities/${id}`, { method: "PUT", body: input, schema: activitySchema });
  deleteActivity = (id: string) => this.request(`/activities/${id}`, { method: "DELETE" });

  // Stats
  getOverview = (period: Period, tz: string, signal?: AbortSignal) =>
    this.request("/stats/overview", { schema: overviewSchema, query: { ...period, tz }, signal });
  getTimeline = (period: Period, tz: string, bucket: Bucket, signal?: AbortSignal) =>
    this.request("/stats/timeline", { schema: z.array(timelinePointSchema), query: { ...period, tz, bucket }, signal });
  getMuscles = (period: Period, tz: string, signal?: AbortSignal) =>
    this.request("/stats/muscles", { schema: z.array(muscleVolumeSchema), query: { ...period, tz }, signal });
  getRecords = (signal?: AbortSignal) => this.request("/stats/records", { schema: z.array(exerciseRecordSchema), signal });

  // Progress photos
  listPhotos = (workoutId?: string, offset = 0) =>
    this.request("/progress-photos", {
      schema: z.array(progressPhotoSchema),
      query: { workout_id: workoutId, limit: 100, offset },
    });
  deletePhoto = (id: string) => this.request(`/progress-photos/${id}`, { method: "DELETE" });

  /** The id is kept across retries, so an uncertain response cannot create a second attachment */
  uploadPhoto = (id: string, file: File, workoutId: string, onProgress: (percent: number) => void) =>
    new Promise<ProgressPhoto>((resolve, reject) => {
      const token = this.token();
      if (!token) {
        reject(new ApiError(401, "unauthorized", "Sign in to upload a photo."));
        return;
      }
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", this.url(`/progress-photos/${id}`));
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.timeout = 60_000;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onerror = () => {
        reportNoResponse();
        reject(new ApiError(0, "network_error", "Upload failed. Try again when connected."));
      };
      xhr.ontimeout = () => {
        reportNoResponse();
        reject(new ApiError(0, "timeout", "Upload timed out. Try again."));
      };
      xhr.onload = () => {
        reportResponse(xhr.status);
        if (xhr.status === 401) this.unauthorized();
        let body: unknown;
        try {
          body = JSON.parse(xhr.responseText || "null");
        } catch {
          body = null;
        }
        if (xhr.status < 200 || xhr.status >= 300) {
          const error = body as { code?: string; message?: string } | null;
          reject(new ApiError(xhr.status, error?.code ?? "http_error", error?.message ?? "Upload failed."));
          return;
        }
        const parsed = progressPhotoSchema.safeParse(body);
        if (!parsed.success) {
          reject(new ApiError(xhr.status, "invalid_response", "The server sent an unexpected response."));
          return;
        }
        resolve(parsed.data);
      };
      const form = new FormData();
      form.append("workout_id", workoutId);
      form.append("file", file);
      xhr.send(form);
    });

  photoBlob = async (id: string, size: "full" | "thumb"): Promise<Blob> => {
    const token = this.token();
    if (!token) throw new ApiError(401, "unauthorized", "Sign in to view photos.");
    let response: Response;
    try {
      response = await fetch(this.url(`/progress-photos/${id}/file?size=${size}`), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {
      reportNoResponse();
      throw new ApiError(0, "network_error", "Photo unavailable while offline.");
    }
    reportResponse(response.status);
    if (response.status === 401) this.unauthorized();
    if (!response.ok) throw new ApiError(response.status, "photo_unavailable", "Could not load photo.");
    return response.blob();
  };
}

export const fittune = new FitTuneClient();
```

Create `src/api/fithealth.ts`:

```ts
import { ApiClient } from "./client";

/** FitHealth nutrition endpoints under `/api/v1/health`, methods arrive with the food diary (#28) */
class FitHealthClient extends ApiClient {
  constructor() {
    super("/health");
  }
}

export const fithealth = new FitHealthClient();
```

Delete `src/api/photos.ts`.

- [ ] **Step 6: Reduce the query modules to query options**

Replace each module with exactly this content.

`src/api/auth.ts`:

```ts
import { queryOptions } from "@tanstack/react-query";

import { account } from "./account";
import { queryKeys } from "./query-keys";

export const meQuery = () =>
  queryOptions({ queryKey: queryKeys.me, queryFn: ({ signal }) => account.getMe(signal), staleTime: 5 * 60_000 });
```

`src/api/exercises.ts`:

```ts
import { queryOptions } from "@tanstack/react-query";

import { fittune } from "./fittune";
import { queryKeys } from "./query-keys";

/** The full visible library. Filtering happens client-side: it is small and must work offline. */
export const exercisesQuery = () =>
  queryOptions({
    queryKey: queryKeys.exercises.list(),
    queryFn: ({ signal }) => fittune.getExercises(signal),
    staleTime: 30 * 60_000,
  });

export const exerciseQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.exercises.detail(id),
    queryFn: ({ signal }) => fittune.getExercise(id, signal),
  });

export const exerciseHistoryQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.exercises.history(id),
    queryFn: ({ signal }) => fittune.getExerciseHistory(id, signal),
  });
```

`src/api/friends.ts`:

```ts
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { account } from "./account";
import { queryKeys } from "./query-keys";
import type { Period } from "@/schemas/stats";

export const friendsQuery = () =>
  queryOptions({ queryKey: queryKeys.friends.list, queryFn: ({ signal }) => account.getFriends(signal) });

export const friendRequestsQuery = () =>
  queryOptions({ queryKey: queryKeys.friends.requests, queryFn: ({ signal }) => account.getFriendRequests(signal) });

export const blocksQuery = () =>
  queryOptions({ queryKey: queryKeys.friends.blocks, queryFn: ({ signal }) => account.getBlocks(signal) });

export const sharingQuery = () =>
  queryOptions({ queryKey: queryKeys.friends.sharing, queryFn: ({ signal }) => account.getSharing(signal) });

export const lookupUserQuery = (username: string) =>
  queryOptions({
    queryKey: queryKeys.friends.lookup(username),
    queryFn: ({ signal }) => account.lookupUser(username, signal),
    // A missing user is an answer, not a failure worth retrying
    retry: false,
    staleTime: 0,
  });

/** Every friend's shared sessions, or one friend's when `userId` is given */
export const friendFeedQuery = (userId?: string) =>
  infiniteQueryOptions({
    queryKey: userId ? queryKeys.friends.userFeed(userId) : queryKeys.friends.feed,
    queryFn: ({ pageParam, signal }) => account.getFriendFeed(userId, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });

export const friendQuery = (userId: string) =>
  queryOptions({ queryKey: queryKeys.friends.detail(userId), queryFn: ({ signal }) => account.getFriend(userId, signal) });

export const friendOverviewQuery = (userId: string, period: Period, tz: string) =>
  queryOptions({
    queryKey: queryKeys.friends.overview(userId, period, tz),
    queryFn: ({ signal }) => account.getFriendOverview(userId, period, tz, signal),
  });

export const friendRecordsQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.friends.records(userId),
    queryFn: ({ signal }) => account.getFriendRecords(userId, signal),
  });
```

`src/api/invites.ts`:

```ts
import { queryOptions } from "@tanstack/react-query";

import { account } from "./account";
import { queryKeys } from "./query-keys";

export const invitesQuery = () =>
  queryOptions({ queryKey: queryKeys.invites, queryFn: ({ signal }) => account.getInvites(signal) });
```

`src/api/routines.ts`:

```ts
import { queryOptions } from "@tanstack/react-query";

import { fittune } from "./fittune";
import { queryKeys } from "./query-keys";

export const routinesQuery = () =>
  queryOptions({ queryKey: queryKeys.routines.list, queryFn: ({ signal }) => fittune.getRoutines(signal) });

export const routineQuery = (id: string) =>
  queryOptions({ queryKey: queryKeys.routines.detail(id), queryFn: ({ signal }) => fittune.getRoutine(id, signal) });
```

`src/api/places.ts`:

```ts
import { queryOptions } from "@tanstack/react-query";

import { fittune } from "./fittune";
import { queryKeys } from "./query-keys";

export const placesQuery = () =>
  queryOptions({ queryKey: queryKeys.places, queryFn: ({ signal }) => fittune.getPlaces(signal) });
```

`src/api/workouts.ts`:

```ts
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { fittune } from "./fittune";
import { queryKeys } from "./query-keys";

export const workoutsInfiniteQuery = (status?: "in_progress" | "completed") =>
  infiniteQueryOptions({
    queryKey: queryKeys.workouts.list(status),
    queryFn: ({ pageParam, signal }) => fittune.getWorkoutsPage(status, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });

export const workoutQuery = (id: string) =>
  queryOptions({ queryKey: queryKeys.workouts.detail(id), queryFn: ({ signal }) => fittune.getWorkout(id, signal) });
```

`src/api/activities.ts`:

```ts
import { infiniteQueryOptions } from "@tanstack/react-query";

import { fittune } from "./fittune";
import { queryKeys } from "./query-keys";
import type { ActivityKind } from "@/schemas/common";

export const activitiesInfiniteQuery = (kind?: ActivityKind) =>
  infiniteQueryOptions({
    queryKey: queryKeys.activities.list(kind),
    queryFn: ({ pageParam, signal }) => fittune.getActivitiesPage(kind, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
```

`src/api/stats.ts`:

```ts
import { queryOptions } from "@tanstack/react-query";

import { fittune } from "./fittune";
import { queryKeys } from "./query-keys";
import type { Bucket, Period } from "@/schemas/stats";

export const overviewQuery = (period: Period, tz: string) =>
  queryOptions({
    queryKey: queryKeys.stats.overview(period, tz),
    queryFn: ({ signal }) => fittune.getOverview(period, tz, signal),
  });

export const timelineQuery = (period: Period, tz: string, bucket: Bucket) =>
  queryOptions({
    queryKey: queryKeys.stats.timeline(period, tz, bucket),
    queryFn: ({ signal }) => fittune.getTimeline(period, tz, bucket, signal),
  });

export const musclesQuery = (period: Period, tz: string) =>
  queryOptions({
    queryKey: queryKeys.stats.muscles(period, tz),
    queryFn: ({ signal }) => fittune.getMuscles(period, tz, signal),
  });

export const recordsQuery = () =>
  queryOptions({ queryKey: queryKeys.stats.records, queryFn: ({ signal }) => fittune.getRecords(signal) });
```

In `src/api/mutation-defaults.ts` replace `import { deleteActivity, putActivity } from "./activities";` with `import { fittune } from "./fittune";` and the two `mutationFn` bodies with `fittune.putActivity(id, input)` and `fittune.deleteActivity(id)`.

- [ ] **Step 7: Move every call site to a client**

For each file, drop the old named import, add the client import (`import { account } from "@/api/account";` or `import { fittune } from "@/api/fittune";`) in the file's import order, and replace each bare identifier with the client member (`login` becomes `account.login`, including when passed as `mutationFn: login`).

| File | Old import | New references |
| --- | --- | --- |
| `src/features/auth/components/login-form.tsx` | `login` from `@/api/auth` | `account.login` |
| `src/features/auth/components/register-form.tsx` | `register` from `@/api/auth` | `account.register` |
| `src/features/auth/sign-out.ts` | `logout` from `@/api/auth` | `account.logout` |
| `src/features/profile/components/account-security.tsx` | `changePassword, deleteAccount` from `@/api/auth` | `account.changePassword`, `account.deleteAccount` |
| `src/features/profile/components/profile-form.tsx` | `updateProfile` from `@/api/auth` | `account.updateProfile` |
| `src/features/friends/components/blocked-users.tsx` | `unblockUser` from `@/api/friends` (keep `blocksQuery`) | `account.unblockUser` |
| `src/features/friends/components/find-friend.tsx` | `acceptFriendRequest, deleteFriendRequest, sendFriendRequest` (keep `lookupUserQuery`) | `account.*` |
| `src/features/friends/components/friend-profile.tsx` | `blockUser, removeFriend` (keep the queries) | `account.blockUser`, `account.removeFriend` |
| `src/features/friends/components/friend-requests.tsx` | `acceptFriendRequest, deleteFriendRequest` (keep `friendRequestsQuery`) | `account.*` |
| `src/features/friends/components/sharing-settings.tsx` | `updateSharing` (keep `sharingQuery`) | `account.updateSharing` |
| `src/features/invites/components/create-invite.tsx` | `createInvite` from `@/api/invites` | `account.createInvite` |
| `src/features/invites/components/invite-list.tsx` | `revokeInvite` (keep `invitesQuery`) | `account.revokeInvite` |
| `src/features/exercises/components/exercise-detail.tsx` | `archiveExercise` (keep `exerciseHistoryQuery`) | `fittune.archiveExercise` |
| `src/features/exercises/components/exercise-form.tsx` | `createExercise, updateExercise` | `fittune.*` |
| `src/features/places/components/place-form.tsx` | `savePlace` | `fittune.savePlace` |
| `src/features/places/components/place-picker.tsx` | `archivePlace` (keep `placesQuery`) | `fittune.archivePlace` |
| `src/features/progress/components/progress-photos.tsx` | `deletePhoto, listPhotos, uploadPhoto` from `@/api/photos` | `fittune.*` |
| `src/features/progress/components/progress-photo.tsx` | `photoBlob` from `@/api/photos` | `fittune.photoBlob` |
| `src/features/routines/components/routine-editor.tsx` | `createRoutine, deleteRoutine, updateRoutine` | `fittune.*` |
| `src/features/workouts/components/workout-detail.tsx` | `createRoutine` from routines, `deleteWorkout` from workouts (keep `workoutQuery`) | `fittune.*` |
| `src/features/workouts/components/active-workout.tsx` | `deleteWorkout` | `fittune.deleteWorkout` |
| `src/features/workouts/use-workout-sync.ts` | `getWorkout, putWorkout` | `fittune.*` |
| `src/features/offline/sync.ts` | `getMe`, `getExerciseHistory, getExercises`, `getPlaces`, `getRoutines`, `getRecords`, `getWorkout, getWorkoutsPage` | `account.getMe`, `fittune.*` |

`src/routes/_app/exercises/$exerciseId.tsx` uses `exerciseHistoryQuery` only and needs no change.
If `bun run typecheck` reports another importer of a removed export, apply the same rule to it.

- [ ] **Step 8: Point the existing tests at the transport**

In `src/features/offline/sync.test.ts`:

```ts
import { ApiError } from "@/api/client";
import { send } from "@/api/transport";
```

replace the `vi.mock("@/api/client", ...)` block with:

```ts
vi.mock("@/api/transport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/transport")>()),
  send: vi.fn(),
}));
```

replace every `vi.mocked(request)` with `vi.mocked(send)` and `as typeof request` with `as typeof send`, and prefix every training path with `/train` in `respond` and in the expected list:

```ts
function respond(path: string, options?: { query?: { status?: string } }) {
  requested.push(options?.query?.status ? `${path}?${options.query.status}` : path);
  if (path === "/train/workouts") {
    const items = options?.query?.status === "completed" ? [{ id: "w1" }, { id: "w2" }] : [];
    return Promise.resolve({ items, next_cursor: null });
  }
  if (path === "/train/workouts/w1") return Promise.resolve({ id: "w1", exercises: [{ exercise_id: "bench" }, { exercise_id: "squat" }] });
  if (path === "/train/workouts/w2") return Promise.resolve({ id: "w2", exercises: [{ exercise_id: "bench" }] });
  if (path === "/train/exercises/squat/history") return Promise.reject(new ApiError(500, "internal_error", "boom"));
  return Promise.resolve(path === "/me" ? { id: "me" } : []);
}
```

```ts
    expect(requested).toEqual(
      expect.arrayContaining(["/me", "/train/exercises", "/train/routines", "/train/places", "/train/stats/records", "/train/workouts?completed", "/train/workouts?in_progress", "/train/workouts/w1", "/train/workouts/w2", "/train/exercises/bench/history", "/train/exercises/squat/history"]),
    );
    // Each exercise's history is fetched once even when it appears in several workouts
    expect(requested.filter((path) => path === "/train/exercises/bench/history")).toHaveLength(1);
```

In `src/features/offline/use-offline-sync.test.ts` make the same import, mock and `request` to `send` changes, and change `answer` to:

```ts
  const answer = (path: string): unknown => (path === "/train/workouts" ? { items: [], next_cursor: null } : path === "/me" ? { id: "me" } : []);
```

In `src/features/friends/components/sharing-settings.test.tsx` replace the `vi.mock("@/api/friends", ...)` block and the `updateSharing` import with:

```ts
import { account } from "@/api/account";

const updateSharing = vi.spyOn(account, "updateSharing").mockImplementation((sharing) => Promise.resolve(sharing));
```

keeping the existing assertion `expect(updateSharing).toHaveBeenCalledWith({ ...nothing, personal_records: true }, expect.anything())`.
If the original mock also replaced `sharingQuery` or other exports, keep those overrides in a `vi.mock("@/api/friends", ...)` without `updateSharing`.

- [ ] **Step 9: Run the tests and the typecheck**

Run: `bun run typecheck && bun run test`
Expected: PASS, including the three new `ApiClient` tests and the moved transport tests

- [ ] **Step 10: Confirm nothing bypasses the clients**

Run: `grep -rn "from \"@/api/transport\"\|from \"./transport\"" src --include=*.ts --include=*.tsx | grep -v "\.test\."`
Expected: only `src/api/client.ts`
Run: `grep -rn "/api/v1" src | grep -v "\.test\."`
Expected: only `src/api/transport.ts`

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "Split API access into account, FitTune and FitHealth clients"
```

---

### Task 3: App model, routes and launcher

**Files:**
- Create: `src/features/apps/apps.ts`, `src/features/apps/store.ts`, `src/features/apps/use-active-app.ts`, `src/features/apps/use-active-app.test.ts`, `src/features/apps/components/app-mark.tsx`, `src/features/apps/components/launcher.tsx`, `src/features/apps/routing.test.tsx`, `src/features/health/components/health-home.tsx`, `src/routes/index.tsx`, `src/routes/_app/train.tsx`, `src/routes/_app/health.tsx`, `src/routes/_app/health/index.tsx`
- Delete: `src/routes/_app/index.tsx`
- Modify: `src/features/auth/session.ts`, `src/routes/_app.tsx`, `src/components/layout/logo.tsx`, `src/components/layout/nav-items.ts:20,32`, `src/components/layout/app-shell.tsx:15`, the ten FitTune route files listed in Step 7, `src/lib/pl.ts`

**Interfaces:**
- Produces: `type AppId = "train" | "health"`, `apps: Record<AppId, AppDefinition>`, `appIds: readonly AppId[]`, `isAppId(value: unknown): value is AppId` in `apps.ts`
- Produces: `useLastApp` zustand store `{ lastApp: AppId | null; setLastApp(app: AppId): void }`, persisted as `fittune.last-app`
- Produces: `resolveActiveApp(matches, lastApp): AppId`, `useActiveApp(): AppId`, `useRouteApp(): AppId | undefined` in `use-active-app.ts`
- Produces: `requireAuth(location: ParsedLocation): void` in `src/features/auth/session.ts`
- Produces: `AppMark({ app, className })`, `Logo({ app?, className })`
- Produces: routes `/`, `/train`, `/health`; `staticData: { app?: AppId }` on routes

- [ ] **Step 1: Write the failing resolver test**

Create `src/features/apps/use-active-app.test.ts`:

```ts
import { expect, it } from "vitest";

import { resolveActiveApp } from "./use-active-app";

it("prefers the app of the deepest route that declares one", () => {
  const matches = [{ staticData: {} }, { staticData: { app: "health" as const } }, { staticData: {} }];
  expect(resolveActiveApp(matches, "train")).toBe("health");
});

it("falls back to the last used app on shared pages", () => {
  expect(resolveActiveApp([{ staticData: {} }], "health")).toBe("health");
});

it("defaults to FitTune when nothing is known", () => {
  expect(resolveActiveApp([{ staticData: {} }], null)).toBe("train");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `bun run test src/features/apps/use-active-app.test.ts`
Expected: FAIL, cannot resolve `./use-active-app`

- [ ] **Step 3: Write the app model, store and resolver**

Create `src/features/apps/apps.ts`:

```ts
export type AppId = "train" | "health";

export type AppDefinition = {
  id: AppId;
  /** Brand name, never translated */
  name: string;
  home: "/train" | "/health";
  /** One line for the launcher, translated at render */
  description: string;
};

export const apps: Record<AppId, AppDefinition> = {
  train: {
    id: "train",
    name: "FitTune",
    home: "/train",
    description: "Training: workouts, routines, progress",
  },
  health: {
    id: "health",
    name: "FitHealth",
    home: "/health",
    description: "Nutrition: food diary and product scanning",
  },
};

export const appIds: readonly AppId[] = ["train", "health"];

/** Guards values read from storage, an older build may have written something else */
export function isAppId(value: unknown): value is AppId {
  return typeof value === "string" && (appIds as readonly string[]).includes(value);
}

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** The app a page belongs to. Shared pages leave it out and stay in the current app */
    app?: AppId;
  }
}
```

Create `src/features/apps/store.ts`:

```ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { type AppId, isAppId } from "./apps";
import { storage } from "@/lib/storage";

type LastAppState = {
  lastApp: AppId | null;
  setLastApp: (app: AppId) => void;
};

/** The app used last on this device, so starting the PWA opens it again */
export const useLastApp = create<LastAppState>()(
  persist(
    (set) => ({
      lastApp: null,
      setLastApp: (lastApp) => set({ lastApp }),
    }),
    {
      name: "fittune.last-app",
      storage: createJSONStorage(() => storage),
      partialize: ({ lastApp }) => ({ lastApp }),
      // An unknown value from another build means "not chosen yet", not a broken redirect
      merge: (persisted, current) => {
        const lastApp = (persisted as { lastApp?: unknown } | undefined)?.lastApp;
        return { ...current, lastApp: isAppId(lastApp) ? lastApp : null };
      },
    },
  ),
);
```

Create `src/features/apps/use-active-app.ts`:

```ts
import { useMatches } from "@tanstack/react-router";

import type { AppId } from "./apps";
import { useLastApp } from "./store";

type MatchWithApp = { staticData?: { app?: AppId } };

/** The app of the deepest route that declares one, otherwise the last used app, otherwise FitTune */
export function resolveActiveApp(matches: readonly MatchWithApp[], lastApp: AppId | null): AppId {
  return routeApp(matches) ?? lastApp ?? "train";
}

function routeApp(matches: readonly MatchWithApp[]): AppId | undefined {
  for (let i = matches.length - 1; i >= 0; i--) {
    const app = matches[i]?.staticData?.app;
    if (app) return app;
  }
  return undefined;
}

export function useActiveApp(): AppId {
  const matches = useMatches();
  const lastApp = useLastApp((state) => state.lastApp);
  return resolveActiveApp(matches, lastApp);
}

/** The app the current page itself declares, undefined on shared pages */
export function useRouteApp(): AppId | undefined {
  return routeApp(useMatches());
}
```

- [ ] **Step 4: Run the resolver test**

Run: `bun run test src/features/apps/use-active-app.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing routing tests**

Create `src/features/apps/routing.test.tsx`:

```tsx
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useLastApp } from "./store";
import { useSession } from "@/features/auth/session";
import { storage } from "@/lib/storage";
import { routeTree } from "@/routeTree.gen";

function makeRouter(path: string) {
  return createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
}

beforeEach(() => {
  // The shell prefetches the profile, a request that never answers keeps tests offline
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
  useSession.setState({ token: "token", userId: "user" });
  useLastApp.setState({ lastApp: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  useSession.setState({ token: null, userId: null });
});

it("sends a signed-out visitor to login even with a remembered app", async () => {
  useSession.setState({ token: null, userId: null });
  useLastApp.setState({ lastApp: "health" });
  const router = makeRouter("/");
  void router.load();
  await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
});

it.each([
  ["train", "/train"],
  ["health", "/health"],
] as const)("opens the remembered %s app", async (app, home) => {
  useLastApp.setState({ lastApp: app });
  const router = makeRouter("/");
  void router.load();
  await waitFor(() => expect(router.state.location.pathname).toBe(home));
});

it("shows the launcher on first run", async () => {
  render(<RouterProvider router={makeRouter("/")} />);
  expect(await screen.findByRole("link", { name: /FitHealth/ })).toHaveAttribute("href", "/health");
  expect(screen.getByRole("link", { name: /FitTune/ })).toHaveAttribute("href", "/train");
});

it("shows the launcher when storage holds an app this build does not know", async () => {
  storage.setItem("fittune.last-app", JSON.stringify({ state: { lastApp: "nutrition" }, version: 0 }));
  await useLastApp.persist.rehydrate();
  expect(useLastApp.getState().lastApp).toBeNull();
  render(<RouterProvider router={makeRouter("/")} />);
  expect(await screen.findByRole("link", { name: /FitHealth/ })).toBeInTheDocument();
  storage.removeItem("fittune.last-app");
});
```

- [ ] **Step 6: Run them to verify they fail**

Run: `bun run test src/features/apps/routing.test.tsx`
Expected: FAIL, `/` renders the old dashboard route instead of redirecting

- [ ] **Step 7: Add the routes**

In `src/features/auth/session.ts` add at the top `import { type ParsedLocation, redirect } from "@tanstack/react-router";` and at the bottom:

```ts
/** Sends a signed-out visitor to login, and back to where they were going afterwards */
export function requireAuth(location: ParsedLocation) {
  if (!isAuthenticated()) throw redirect({ to: "/login", search: { redirect: location.href } });
}
```

In `src/routes/_app.tsx` replace the `beforeLoad` body's `if (!isAuthenticated()) { ... }` block with `requireAuth(location);` and import `requireAuth` instead of `isAuthenticated`.

Move the dashboard: `git mv src/routes/_app/index.tsx src/routes/_app/train.tsx` and make it:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { Dashboard } from "@/features/home/components/dashboard";

export const Route = createFileRoute("/_app/train")({
  staticData: { app: "train" },
  component: Dashboard,
});
```

Create `src/routes/index.tsx`:

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";

import { apps } from "@/features/apps/apps";
import { Launcher } from "@/features/apps/components/launcher";
import { useLastApp } from "@/features/apps/store";
import { requireAuth } from "@/features/auth/session";

/** Entry point and the PWA's start URL: reopens the last used app, or lets the user pick one */
export const Route = createFileRoute("/")({
  beforeLoad: ({ location }) => {
    requireAuth(location);
    const { lastApp } = useLastApp.getState();
    if (lastApp) throw redirect({ to: apps[lastApp].home, replace: true });
  },
  component: Launcher,
});
```

Create `src/routes/_app/health.tsx`:

```tsx
import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Parent of every FitHealth page */
export const Route = createFileRoute("/_app/health")({
  staticData: { app: "health" },
  component: Outlet,
});
```

Create `src/routes/_app/health/index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { HealthHome } from "@/features/health/components/health-home";

export const Route = createFileRoute("/_app/health/")({
  component: HealthHome,
});
```

Create `src/features/health/components/health-home.tsx`:

```tsx
import { SaladIcon } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/lib/i18n";

/** Placeholder until the food diary (#28) */
export function HealthHome() {
  return (
    <>
      <PageHeader eyebrow="FitHealth" title={t("Today")} />
      <Card>
        <CardContent className="flex items-center gap-3 py-6 text-muted-foreground">
          <SaladIcon className="size-6 shrink-0 text-primary-strong" aria-hidden />
          <p>{t("Your food diary arrives here soon.")}</p>
        </CardContent>
      </Card>
    </>
  );
}
```

Check `src/components/ui/card.tsx` exports `Card` and `CardContent`; if `CardContent` is named differently, use the existing name.

Add `staticData: { app: "train" },` as the first option of `createFileRoute(...)({` in each FitTune route: `src/routes/_app/activity.tsx`, `src/routes/_app/workout.tsx`, `src/routes/_app/progress.tsx`, `src/routes/_app/exercises/index.tsx`, `src/routes/_app/exercises/$exerciseId.tsx`, `src/routes/_app/routines/index.tsx`, `src/routes/_app/routines/new.tsx`, `src/routes/_app/routines/$routineId.tsx`, `src/routes/_app/workouts/index.tsx`, `src/routes/_app/workouts/$workoutId.tsx`.
Leave `src/routes/_app/profile.tsx` and `src/routes/_app/friends/*` without `staticData`: they are shared.

Keep FitTune links working until the nav moves in Task 5: in `src/components/layout/nav-items.ts` change both `to: "/"` to `to: "/train"`; in `src/components/layout/app-shell.tsx` change `pathname === "/"` to `pathname === "/train"`.

- [ ] **Step 8: Add the mark, the logo prop and the launcher**

Create `src/features/apps/components/app-mark.tsx`:

```tsx
import type { AppId } from "../apps";
import { cn } from "@/lib/utils";

/**
 * Square app icon. Fixed brand colours (lime from public/favicon.svg, teal for FitHealth) so
 * the marks look the same in both themes
 */
export function AppMark({ app, className }: { app: AppId; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="512" height="512" rx="112" fill="#0f1115" strokeWidth="24" className="dark:stroke-white/15" />
      {app === "train" ? (
        <g fill="#c6f432">
          <rect x="96" y="206" width="44" height="100" rx="14" />
          <rect x="372" y="206" width="44" height="100" rx="14" />
          <rect x="146" y="176" width="44" height="160" rx="14" />
          <rect x="322" y="176" width="44" height="160" rx="14" />
          <rect x="190" y="238" width="132" height="36" rx="10" />
        </g>
      ) : (
        <g fill="none" stroke="#2dd4bf" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round">
          <path d="M150 362c0-130 80-212 222-212 0 142-82 222-212 222" />
          <path d="M150 362l120-120" />
        </g>
      )}
    </svg>
  );
}
```

Replace `src/components/layout/logo.tsx` with:

```tsx
import { apps, type AppId } from "@/features/apps/apps";
import { AppMark } from "@/features/apps/components/app-mark";
import { cn } from "@/lib/utils";

export function Logo({ app = "train", className }: { app?: AppId; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-display text-2xl font-bold tracking-wide uppercase", className)}>
      <AppMark app={app} />
      {apps[app].name}
    </span>
  );
}
```

Create `src/features/apps/components/launcher.tsx`:

```tsx
import { Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";

import { appIds, apps } from "../apps";
import { AppMark } from "./app-mark";
import { Logo } from "@/components/layout/logo";
import { t } from "@/lib/i18n";

/** First run only: once an app is used, `/` opens it directly */
export function Launcher() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-8 px-4 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <Logo />
      <h1 className="font-display text-4xl font-bold tracking-wide uppercase">{t("Where to today?")}</h1>
      <ul className="flex flex-col gap-3">
        {appIds.map((id) => (
          <li key={id} data-app={id}>
            <Link
              to={apps[id].home}
              className="flex items-center gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-primary focus-visible:border-primary"
            >
              <AppMark app={id} className="size-14" />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl font-bold tracking-wide uppercase">{apps[id].name}</span>
                <span className="block text-sm text-muted-foreground">{t(apps[id].description)}</span>
              </span>
              <ChevronRightIcon className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

Add to `src/lib/pl.ts`, grouped at the end of the object:

```ts
  "Where to today?": "Dokąd dzisiaj?",
  "Training: workouts, routines, progress": "Trening: treningi, plany, postępy",
  "Nutrition: food diary and product scanning": "Odżywianie: dziennik posiłków i skanowanie produktów",
  "Your food diary arrives here soon.": "Wkrótce pojawi się tu dziennik posiłków.",
```

- [ ] **Step 9: Regenerate routes and run the tests**

Run: `bunx vite build` once so the router plugin regenerates `src/routeTree.gen.ts` (`bun run build` runs `tsc -b` first, which fails until the tree is regenerated), then `bun run typecheck && bun run test src/features/apps`
Expected: PASS, all routing tests including the unknown stored value

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "Open the last used app from / and add the FitHealth route skeleton"
```

---

### Task 4: FitHealth is online only

**Files:**
- Create: `src/test/router.tsx`, `src/features/health/components/online-only.tsx`, `src/features/health/components/online-only.test.tsx`
- Modify: `src/routes/_app/health.tsx`, `src/components/layout/app-shell.tsx`, `src/lib/query-client.ts:36-42`, `src/lib/query-client.test.ts`, `src/lib/pl.ts`

**Interfaces:**
- Consumes: `useRouteApp()` from Task 3, `useOffline()` and `useConnectivity` from `src/lib/connectivity.ts`
- Produces: `OnlineOnly({ children })`; `renderInRouter(ui, { path?, app? })` test helper returning the router

- [ ] **Step 1: Add the router test helper**

Create `src/test/router.tsx`:

```tsx
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import type * as React from "react";

import type { AppId } from "@/features/apps/apps";

/**
 * Renders `ui` as the page at `path` of a one-route router, so components that use links,
 * matches or `staticData` work without the whole app
 */
export function renderInRouter(ui: () => React.ReactNode, { path = "/", app }: { path?: string; app?: AppId } = {}) {
  const root = createRootRoute({ component: Outlet });
  const page = createRoute({ getParentRoute: () => root, path, staticData: app ? { app } : {}, component: ui });
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}
```

- [ ] **Step 2: Write the failing gate and persistence tests**

Create `src/features/health/components/online-only.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { OnlineOnly } from "./online-only";
import { useConnectivity } from "@/lib/connectivity";
import { renderInRouter } from "@/test/router";

const page = () => (
  <OnlineOnly>
    <p>Diary</p>
  </OnlineOnly>
);

afterEach(() => {
  useConnectivity.setState({ deviceOnline: true, manualOffline: false, apiDown: false });
});

it("shows the page when online", async () => {
  renderInRouter(page);
  expect(await screen.findByText("Diary")).toBeInTheDocument();
});

it.each([
  ["the device is offline", { deviceOnline: false }, "FitHealth needs a connection"],
  ["offline mode is on", { manualOffline: true }, "FitHealth needs a connection"],
  ["the servers are down", { apiDown: true }, "FitHealth's servers are unavailable right now"],
])("explains itself when %s", async (_, state, title) => {
  useConnectivity.setState(state);
  renderInRouter(page);
  expect(await screen.findByText(title)).toBeInTheDocument();
  expect(screen.queryByText("Diary")).not.toBeInTheDocument();
});

it("links to the offline mode switch when it is on", async () => {
  useConnectivity.setState({ manualOffline: true });
  renderInRouter(page);
  expect(await screen.findByRole("link", { name: "Turn it off in Profile" })).toHaveAttribute("href", "/profile");
});
```

Append to `src/lib/query-client.test.ts`:

```ts
it("keeps FitHealth data out of the persisted offline cache", () => {
  const client = new QueryClient();
  client.setQueryData(queryKeys.places, []);
  client.setQueryData(["health", "diary", "2026-09-28"], []);

  const persisted = dehydrate(client, { shouldDehydrateQuery: shouldPersistQuery }).queries.map((q) => q.queryKey);
  expect(persisted).toEqual([queryKeys.places]);
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `bun run test src/features/health src/lib/query-client.test.ts`
Expected: FAIL, cannot resolve `./online-only`, and the health key is persisted

- [ ] **Step 4: Implement the gate and the persistence rule**

Create `src/features/health/components/online-only.tsx`:

```tsx
import { Link } from "@tanstack/react-router";
import { CloudOffIcon, PlaneIcon, ServerCrashIcon } from "lucide-react";
import type * as React from "react";

import { type OfflineReason, useOffline } from "@/lib/connectivity";
import { t } from "@/lib/i18n";

const copy: Record<OfflineReason, { icon: typeof CloudOffIcon; title: string; body: string }> = {
  device: {
    icon: CloudOffIcon,
    title: "FitHealth needs a connection",
    body: "Nutrition data lives on our servers. FitTune keeps working offline in the meantime.",
  },
  manual: {
    icon: PlaneIcon,
    title: "FitHealth needs a connection",
    body: "Offline mode is on, so FitHealth can't reach our servers. FitTune keeps working offline.",
  },
  server: {
    icon: ServerCrashIcon,
    title: "FitHealth's servers are unavailable right now",
    body: "Try again in a moment. FitTune keeps working offline in the meantime.",
  },
};

/**
 * FitHealth has no offline mode: without the API it shows why instead of empty or stale
 * screens, and the page comes back on its own once the connection does
 */
export function OnlineOnly({ children }: { children: React.ReactNode }) {
  const { reason } = useOffline();
  if (!reason) return children;

  const { icon: Icon, title, body } = copy[reason];
  return (
    <div role="status" className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-6 text-center">
      <Icon className="size-10 text-muted-foreground" aria-hidden />
      <p className="font-display text-2xl font-bold tracking-wide uppercase">{t(title)}</p>
      <p className="max-w-sm text-muted-foreground">{t(body)}</p>
      {reason === "manual" ? (
        <Link to="/profile" className="font-medium text-primary-strong underline-offset-4 hover:underline">
          {t("Turn it off in Profile")}
        </Link>
      ) : null}
    </div>
  );
}
```

Change `src/routes/_app/health.tsx` to render the gate:

```tsx
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { OnlineOnly } from "@/features/health/components/online-only";

/** Parent of every FitHealth page, all of them need the API */
export const Route = createFileRoute("/_app/health")({
  staticData: { app: "health" },
  component: HealthLayout,
});

function HealthLayout() {
  return (
    <OnlineOnly>
      <Outlet />
    </OnlineOnly>
  );
}
```

In `src/lib/query-client.ts` replace `shouldPersistQuery` and its comment with:

```ts
/**
 * Kept in memory only:
 * - friends' progress, so a friend who stops sharing, unfriends or blocks does not stay
 *   readable from this device's storage
 * - FitHealth data, FitHealth is online only and must never show a stale diary
 */
export function shouldPersistQuery(query: Query) {
  const scope = query.queryKey[0];
  return defaultShouldDehydrateQuery(query) && scope !== "friends" && scope !== "health";
}
```

In `src/components/layout/app-shell.tsx` import `useRouteApp` from `@/features/apps/use-active-app`, add `const routeApp = useRouteApp();` and render the banner only outside FitHealth pages:

```tsx
          {routeApp === "health" ? null : <ConnectionBanner className="mt-4 md:mt-6" />}
```

Add to `src/lib/pl.ts`:

```ts
  "FitHealth needs a connection": "FitHealth wymaga połączenia z internetem",
  "Nutrition data lives on our servers. FitTune keeps working offline in the meantime.": "Dane o odżywianiu są na naszych serwerach. W tym czasie FitTune działa offline.",
  "Offline mode is on, so FitHealth can't reach our servers. FitTune keeps working offline.": "Tryb offline jest włączony, więc FitHealth nie może połączyć się z serwerami. FitTune działa offline.",
  "FitHealth's servers are unavailable right now": "Serwery FitHealth są teraz niedostępne",
  "Try again in a moment. FitTune keeps working offline in the meantime.": "Spróbuj ponownie za chwilę. W tym czasie FitTune działa offline.",
```

- [ ] **Step 5: Run the tests**

Run: `bun run typecheck && bun run test src/features/health src/lib/query-client.test.ts`
Expected: PASS

- [ ] **Step 6: Pin the banner rule on shared pages**

Append to `src/features/health/components/online-only.test.tsx`:

```tsx
import { useRouteApp } from "@/features/apps/use-active-app";

function BannerProbe() {
  // Mirrors the AppShell rule: the FitTune banner hides only on pages that belong to FitHealth
  return <p>{useRouteApp() === "health" ? "gate" : "banner"}</p>;
}

it("keeps the connection banner on shared pages after using FitHealth", async () => {
  renderInRouter(BannerProbe, { path: "/profile" });
  expect(await screen.findByText("banner")).toBeInTheDocument();
});

it("hides the connection banner on FitHealth pages", async () => {
  renderInRouter(BannerProbe, { path: "/health", app: "health" });
  expect(await screen.findByText("gate")).toBeInTheDocument();
});
```

Move the new import to the top import block.
Run: `bun run test src/features/health`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Gate FitHealth behind a connection and keep its data out of the offline cache"
```

---

### Task 5: Per-app navigation, theming and the desktop switcher

**Files:**
- Modify: `src/features/apps/apps.ts`, `src/components/layout/bottom-nav.tsx`, `src/components/layout/sidebar.tsx`, `src/components/layout/app-shell.tsx`, `src/styles.css`, `src/lib/pl.ts`
- Create: `src/features/apps/components/app-segmented-switch.tsx`, `src/features/apps/use-remember-app.ts`, `src/features/apps/shell.test.tsx`
- Delete: `src/components/layout/nav-items.ts`

**Interfaces:**
- Consumes: `apps`, `useActiveApp`, `useRouteApp`, `useLastApp`, `renderInRouter`
- Produces: `NavItem`, `NavGroup`, `AppDefinition.mobileNav`, `AppDefinition.desktopNav`, `AppDefinition.primaryAction: "start-workout" | null`, `isNavDestination(app, pathname): boolean` in `apps.ts`; `useRememberApp()`; `AppSegmentedSwitch()`

- [ ] **Step 1: Write the failing shell tests**

Create `src/features/apps/shell.test.tsx`:

```tsx
import { screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";

import { useLastApp } from "./store";
import { useRememberApp } from "./use-remember-app";
import { isNavDestination } from "./apps";
import { BottomNav } from "@/components/layout/bottom-nav";
import { renderInRouter } from "@/test/router";

function Remember() {
  useRememberApp();
  return null;
}

beforeEach(() => {
  useLastApp.setState({ lastApp: null });
});

it("remembers the app of the page being used", async () => {
  renderInRouter(Remember, { path: "/health", app: "health" });
  await waitFor(() => expect(useLastApp.getState().lastApp).toBe("health"));
});

it("leaves the remembered app alone on shared pages", async () => {
  useLastApp.setState({ lastApp: "health" });
  const router = renderInRouter(Remember, { path: "/profile" });
  await waitFor(() => expect(router.state.status).toBe("idle"));
  expect(useLastApp.getState().lastApp).toBe("health");
});

it("shows FitHealth navigation on FitHealth pages", async () => {
  renderInRouter(BottomNav, { path: "/health", app: "health" });
  expect(await screen.findByRole("link", { name: "Today" })).toHaveAttribute("href", "/health");
  expect(screen.queryByRole("link", { name: "Workout" })).not.toBeInTheDocument();
});

it("keeps FitHealth navigation on a shared page reached from FitHealth", async () => {
  useLastApp.setState({ lastApp: "health" });
  renderInRouter(BottomNav, { path: "/profile" });
  expect(await screen.findByRole("link", { name: "Today" })).toBeInTheDocument();
});

it("shows FitTune navigation on FitTune pages", async () => {
  renderInRouter(BottomNav, { path: "/train", app: "train" });
  expect(await screen.findByRole("link", { name: "Workout" })).toBeInTheDocument();
});

it("knows which screens are top level", () => {
  expect(isNavDestination("train", "/progress")).toBe(true);
  expect(isNavDestination("train", "/workouts/123")).toBe(false);
  expect(isNavDestination("health", "/health")).toBe(true);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `bun run test src/features/apps/shell.test.tsx`
Expected: FAIL, cannot resolve `./use-remember-app`

- [ ] **Step 3: Move the navigation into the app model**

In `src/features/apps/apps.ts` add the icon and route type imports at the top:

```ts
import {
  ActivityIcon,
  BookOpenIcon,
  ChartNoAxesColumnIcon,
  ClipboardListIcon,
  DumbbellIcon,
  HistoryIcon,
  HouseIcon,
  type LucideIcon,
  SunIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";

import type { FileRoutesByTo } from "@/routeTree.gen";
```

add the types and extend `AppDefinition`:

```ts
export type NavItem = { to: keyof FileRoutesByTo; label: string; icon: LucideIcon; exact?: boolean };
export type NavGroup = { heading: string; items: NavItem[] };

export type AppDefinition = {
  id: AppId;
  /** Brand name, never translated */
  name: string;
  home: "/train" | "/health";
  /** One line for the launcher, translated at render */
  description: string;
  /** Phone: a few thumb-reachable destinations */
  mobileNav: NavItem[];
  /** Desktop: every area, grouped */
  desktopNav: NavGroup[];
  /** The big button at the top of the desktop sidebar */
  primaryAction: "start-workout" | null;
};
```

and replace the `apps` constant with:

```ts
export const apps: Record<AppId, AppDefinition> = {
  train: {
    id: "train",
    name: "FitTune",
    home: "/train",
    description: "Training: workouts, routines, progress",
    mobileNav: [
      { to: "/train", label: "Home", icon: HouseIcon, exact: true },
      { to: "/activity", label: "Activity", icon: ActivityIcon },
      { to: "/workout", label: "Workout", icon: DumbbellIcon },
      { to: "/progress", label: "Progress", icon: ChartNoAxesColumnIcon },
      { to: "/profile", label: "Profile", icon: UserRoundIcon },
    ],
    desktopNav: [
      {
        heading: "Train",
        items: [
          { to: "/train", label: "Dashboard", icon: HouseIcon, exact: true },
          { to: "/workout", label: "Workout", icon: DumbbellIcon },
          { to: "/activity", label: "Activity", icon: ActivityIcon },
        ],
      },
      {
        heading: "Analyse",
        items: [
          { to: "/progress", label: "Progress", icon: ChartNoAxesColumnIcon },
          { to: "/workouts", label: "History", icon: HistoryIcon },
        ],
      },
      {
        heading: "Plan",
        items: [
          { to: "/routines", label: "Routines", icon: ClipboardListIcon },
          { to: "/exercises", label: "Exercises", icon: BookOpenIcon },
        ],
      },
      { heading: "Together", items: [{ to: "/friends", label: "Friends", icon: UsersIcon }] },
    ],
    primaryAction: "start-workout",
  },
  health: {
    id: "health",
    name: "FitHealth",
    home: "/health",
    description: "Nutrition: food diary and product scanning",
    mobileNav: [
      { to: "/health", label: "Today", icon: SunIcon, exact: true },
      { to: "/profile", label: "Profile", icon: UserRoundIcon },
    ],
    desktopNav: [{ heading: "Nutrition", items: [{ to: "/health", label: "Today", icon: SunIcon, exact: true }] }],
    primaryAction: null,
  },
};
```

and add below `isAppId`:

```ts
/** Top-level screens of an app: the ones its navigation links to, where the mobile switcher shows */
export function isNavDestination(app: AppId, pathname: string): boolean {
  const { mobileNav, desktopNav } = apps[app];
  return [...mobileNav, ...desktopNav.flatMap((group) => group.items)].some((item) => item.to === pathname);
}
```

Delete `src/components/layout/nav-items.ts`.

- [ ] **Step 4: Remember the app and theme the page**

Create `src/features/apps/use-remember-app.ts`:

```ts
import { useEffect } from "react";

import { useLastApp } from "./store";
import { useActiveApp, useRouteApp } from "./use-active-app";

/**
 * Records the app of the page in use, so `/` reopens it, and exposes the active app on
 * `<html data-app>` so its accent colour also reaches portals such as sheets and dialogs
 */
export function useRememberApp() {
  const routeApp = useRouteApp();
  const activeApp = useActiveApp();
  const setLastApp = useLastApp((state) => state.setLastApp);

  useEffect(() => {
    if (routeApp) setLastApp(routeApp);
  }, [routeApp, setLastApp]);

  useEffect(() => {
    document.documentElement.dataset.app = activeApp;
    return () => {
      delete document.documentElement.dataset.app;
    };
  }, [activeApp]);
}
```

In `src/components/layout/app-shell.tsx` import it and call `useRememberApp();` next to `useAutoOfflineSync();`.

Append to `src/styles.css`, after the `.dark` block:

```css
/* FitHealth: the same product in teal. Only the primary tokens change, so every button,
   active nav item and focus ring follows. `[data-app]` sits on <html> inside the shell and on
   launcher tiles */
[data-app="health"] {
  --primary: oklch(0.8 0.12 185);
  --primary-foreground: oklch(0.22 0.05 195);
  --primary-strong: oklch(0.5 0.1 195);
}

.dark[data-app="health"],
.dark [data-app="health"] {
  --primary: oklch(0.82 0.12 185);
  --primary-foreground: oklch(0.2 0.05 195);
  --primary-strong: oklch(0.82 0.12 185);
}
```

- [ ] **Step 5: Drive the bottom nav and sidebar from the active app**

In `src/components/layout/bottom-nav.tsx` replace `import { mobileNav } from "./nav-items";` with:

```ts
import { apps } from "@/features/apps/apps";
import { useActiveApp } from "@/features/apps/use-active-app";
```

and at the top of the component add `const items = apps[useActiveApp()].mobileNav;`.
Replace `<ul className="mx-auto grid max-w-lg grid-cols-5">` and `{mobileNav.map(` with:

```tsx
      <ul
        className="mx-auto grid max-w-lg"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ to, label, icon: Icon, exact }) => {
```

Create `src/features/apps/components/app-segmented-switch.tsx`:

```tsx
import { Link } from "@tanstack/react-router";

import { appIds, apps } from "../apps";
import { useActiveApp } from "../use-active-app";
import { AppMark } from "./app-mark";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Desktop switcher: both apps side by side, one click away */
export function AppSegmentedSwitch({ className }: { className?: string }) {
  const active = useActiveApp();
  return (
    <nav aria-label={t("Switch app")} className={cn("grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1", className)}>
      {appIds.map((id) => (
        <Link
          key={id}
          to={apps[id].home}
          aria-current={id === active ? "page" : undefined}
          className={cn(
            "flex h-11 items-center justify-center gap-2 rounded-xl font-display text-lg font-bold tracking-wide uppercase text-muted-foreground transition-colors hover:text-foreground",
            id === active && "bg-card text-foreground shadow-sm",
          )}
        >
          <AppMark app={id} className="size-6" />
          {apps[id].name}
        </Link>
      ))}
    </nav>
  );
}
```

In `src/components/layout/sidebar.tsx`:

1. Replace `import { Logo } from "./logo";` and `import { desktopNav } from "./nav-items";` with:

```ts
import { apps } from "@/features/apps/apps";
import { AppSegmentedSwitch } from "@/features/apps/components/app-segmented-switch";
import { useActiveApp } from "@/features/apps/use-active-app";
```

2. At the top of the component add `const app = apps[useActiveApp()];`
3. Replace the `<Link to="/" className="px-2"><Logo /></Link>` element with `<AppSegmentedSwitch />`
4. Replace the `{hasActive ? (...) : (...)}` block with:

```tsx
      {hasActive ? (
        <ActiveWorkoutBar />
      ) : app.primaryAction === "start-workout" ? (
        <Button asChild size="lg" className="w-full">
          <Link to="/workout">
            <PlayIcon className="fill-current" aria-hidden /> {t("Start workout")}
          </Link>
        </Button>
      ) : null}
```

5. Replace `{desktopNav.map(` with `{app.desktopNav.map(`

Add to `src/lib/pl.ts` (skip any key that already exists, `"Today"` does):

```ts
  "Nutrition": "Odżywianie",
  "Switch app": "Zmień aplikację",
```

- [ ] **Step 6: Run the tests and checks**

Run: `bun run typecheck && bun run lint && bun run test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Give each app its own navigation and accent, add the desktop switcher"
```

---

### Task 6: Mobile switcher sheet in the page header

**Files:**
- Create: `src/features/apps/components/app-switcher-sheet.tsx`, `src/features/apps/components/app-switcher-sheet.test.tsx`
- Modify: `src/components/layout/page-header.tsx`

**Interfaces:**
- Consumes: `apps`, `appIds`, `isNavDestination`, `useActiveApp`, `AppMark`, `Drawer*` from `src/components/ui/drawer.tsx`, `renderInRouter`
- Produces: `AppSwitcherSheet({ className })`; `PageHeader` shows it on top-level screens below `md`

- [ ] **Step 1: Write the failing tests**

Create `src/features/apps/components/app-switcher-sheet.test.tsx`:

```tsx
import { fireEvent, screen } from "@testing-library/react";
import { beforeAll, expect, it, vi } from "vitest";

import { PageHeader } from "@/components/layout/page-header";
import { renderInRouter } from "@/test/router";

beforeAll(() => {
  // vaul reads media queries, jsdom has none
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});

const Header = () => <PageHeader title="Today" />;

it("offers the other app from a top-level screen", async () => {
  renderInRouter(Header, { path: "/health", app: "health" });
  fireEvent.click(await screen.findByRole("button", { name: "Switch app" }));
  expect(await screen.findByRole("link", { name: /FitTune/ })).toHaveAttribute("href", "/train");
  expect(screen.getByRole("link", { name: /FitHealth/ })).toHaveAttribute("aria-current", "page");
});

it("stays out of detail screens", async () => {
  renderInRouter(Header, { path: "/workouts/abc", app: "train" });
  await screen.findByRole("heading", { name: "Today" });
  expect(screen.queryByRole("button", { name: "Switch app" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `bun run test src/features/apps/components/app-switcher-sheet.test.tsx`
Expected: FAIL, no "Switch app" button

- [ ] **Step 3: Build the sheet and show it in the header**

Create `src/features/apps/components/app-switcher-sheet.tsx`:

```tsx
import { Link } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";

import { appIds, apps } from "../apps";
import { useActiveApp } from "../use-active-app";
import { AppMark } from "./app-mark";
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Phone switcher: the current app's mark opens a sheet with both apps */
export function AppSwitcherSheet({ className }: { className?: string }) {
  const active = useActiveApp();
  return (
    <Drawer>
      <DrawerTrigger
        aria-label={t("Switch app")}
        className={cn("shrink-0 rounded-xl transition-transform active:scale-95", className)}
      >
        <AppMark app={active} className="size-9" />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("Switch app")}</DrawerTitle>
        </DrawerHeader>
        <ul className="flex flex-col gap-2 px-5 pb-safe">
          {appIds.map((id) => (
            <li key={id} data-app={id}>
              <DrawerClose asChild>
                <Link
                  to={apps[id].home}
                  aria-current={id === active ? "page" : undefined}
                  className="flex items-center gap-4 rounded-2xl border bg-card p-4 aria-[current=page]:border-primary"
                >
                  <AppMark app={id} className="size-11" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-bold tracking-wide uppercase">{apps[id].name}</span>
                    <span className="block text-sm text-muted-foreground">{t(apps[id].description)}</span>
                  </span>
                  {id === active ? <CheckIcon className="size-5 text-primary-strong" aria-hidden /> : null}
                </Link>
              </DrawerClose>
            </li>
          ))}
        </ul>
      </DrawerContent>
    </Drawer>
  );
}
```

In `src/components/layout/page-header.tsx` add the imports:

```ts
import { useRouterState } from "@tanstack/react-router";

import { isNavDestination } from "@/features/apps/apps";
import { AppSwitcherSheet } from "@/features/apps/components/app-switcher-sheet";
import { useActiveApp } from "@/features/apps/use-active-app";
```

at the top of `PageHeader` add:

```ts
  const app = useActiveApp();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // Only top-level screens switch apps, detail screens go back first
  const switcher = isNavDestination(app, pathname) ? <AppSwitcherSheet className="md:hidden" /> : null;
```

and render it first inside the left group:

```tsx
      <div className="flex min-w-0 items-center gap-2">
        {switcher}
        {back}
```

Update the component's doc comment to: `/** Sticky, translucent on phones (like a native nav bar) with the app switcher on top-level screens; a plain heading row on desktop. */`

- [ ] **Step 4: Run the tests**

Run: `bun run typecheck && bun run test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Add the mobile app switcher sheet to top-level page headers"
```

---

### Task 7: Verify end to end and open the PRs

**Files:**
- Modify: only what verification proves broken

- [ ] **Step 1: Run every app check**

Run in `fittune-app`: `bun run typecheck && bun run lint && bun run test && bun run build`
Expected: all pass

- [ ] **Step 2: Start the stack on the new API**

In `fittune-api` on `feat/fithealth-namespaces`, follow `README.md` for local development (Postgres from `docker-compose.yml`, `make seed` for fixtures, `cargo run -- serve` on port 4733).
In `fittune-app` run `bun run dev`.

- [ ] **Step 3: Walk through the app with Playwright**

Use the Playwright MCP browser, at 390x844 and at 1440x900, in light and dark themes, logged in as a fixture user:

- Clear site data, open `/`: the launcher shows both tiles, FitHealth's tile is teal
- Pick FitTune: lands on `/train`, dashboard data loads, reload `/`: back on `/train`
- On mobile, tap the app mark in the header: sheet opens, pick FitHealth: `/health` with teal accent and the two-item bottom nav
- Reload `/`: lands on `/health`
- Open Profile from FitHealth: FitHealth nav stays, the switcher shows
- Desktop: the sidebar switch changes apps in one click, "Start workout" only shows in FitTune
- FitTune screens against the new API paths: workout logging, progress photo upload and display, exercise detail media
- Turn on offline mode in Profile, open FitHealth: the gate with the Profile link; open FitTune: the usual banner and cached data
- Start a workout, switch to FitHealth: the active workout bar stays visible

Screenshot anything misaligned or broken, fix it in the owning component, add a test when the fault is logic, and commit each fix separately.

- [ ] **Step 4: Push and open both PRs**

Show the changed files of both branches and summarise the risk areas (breaking API paths, route move of the dashboard, persisted `fittune.last-app`) before pushing.
Push `feat/fithealth-namespaces` and `feat/fithealth-shell`, open one PR in each repo that links #27 and states they must be merged and deployed together.
