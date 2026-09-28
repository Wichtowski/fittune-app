import type { ActivityKind, Equipment, Muscle } from "@/schemas/common";
import type { Bucket, Period } from "@/schemas/stats";

/** Every server-state cache key in one place, so invalidation stays predictable. */
export const queryKeys = {
  me: ["me"] as const,
  places: ["places"] as const,
  invites: ["invites"] as const,
  exercises: {
    all: ["exercises"] as const,
    list: (filters: { q?: string; muscle?: Muscle; equipment?: Equipment } = {}) =>
      ["exercises", "list", filters] as const,
    detail: (id: string) => ["exercises", "detail", id] as const,
    history: (id: string) => ["exercises", "history", id] as const,
  },
  workouts: {
    all: ["workouts"] as const,
    list: (status?: "in_progress" | "completed") => ["workouts", "list", status ?? "all"] as const,
    detail: (id: string) => ["workouts", "detail", id] as const,
  },
  routines: {
    all: ["routines"] as const,
    list: ["routines", "list"] as const,
    detail: (id: string) => ["routines", "detail", id] as const,
  },
  activities: {
    all: ["activities"] as const,
    list: (kind?: ActivityKind) => ["activities", "list", kind ?? "all"] as const,
    detail: (id: string) => ["activities", "detail", id] as const,
  },
  /** Friend data is never persisted for offline use, see `shouldPersistQuery` */
  friends: {
    all: ["friends"] as const,
    list: ["friends", "list"] as const,
    requests: ["friends", "requests"] as const,
    feed: ["friends", "feed"] as const,
    blocks: ["friends", "blocks"] as const,
    sharing: ["friends", "sharing"] as const,
    lookup: (username: string) => ["friends", "lookup", username.toLowerCase()] as const,
    /** Everything about one friend, dropped together when access ends */
    user: (id: string) => ["friends", "user", id] as const,
    detail: (id: string) => ["friends", "user", id, "detail"] as const,
    userFeed: (id: string) => ["friends", "user", id, "feed"] as const,
    overview: (id: string, period: Period, tz: string) => ["friends", "user", id, "overview", period, tz] as const,
    records: (id: string) => ["friends", "user", id, "records"] as const,
  },
  stats: {
    all: ["stats"] as const,
    overview: (period: Period, tz: string) => ["stats", "overview", period, tz] as const,
    timeline: (period: Period, tz: string, bucket: Bucket) => ["stats", "timeline", period, tz, bucket] as const,
    muscles: (period: Period, tz: string) => ["stats", "muscles", period, tz] as const,
    records: ["stats", "records"] as const,
  },
};
