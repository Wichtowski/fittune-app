import { dehydrate, QueryClient } from "@tanstack/react-query";
import { expect, it } from "vitest";

import { shouldPersistQuery } from "./query-client";
import { queryKeys } from "@/api/query-keys";

it("keeps friends' data out of the persisted offline cache", () => {
  const client = new QueryClient();
  client.setQueryData(queryKeys.workouts.list("completed"), { pages: [], pageParams: [] });
  client.setQueryData(queryKeys.friends.list, []);
  client.setQueryData(queryKeys.friends.records("00000000-0000-4000-8000-000000000001"), []);

  const persisted = dehydrate(client, { shouldDehydrateQuery: shouldPersistQuery }).queries.map((q) => q.queryKey);
  expect(persisted).toEqual([queryKeys.workouts.list("completed")]);
});

it("keeps FitHealth data out of the persisted offline cache", () => {
  const client = new QueryClient();
  client.setQueryData(queryKeys.places, []);
  client.setQueryData(["health", "diary", "2026-09-28"], []);
  client.setQueryData(["admin", "ocr"], { ocr_model: "gpt-6-luna" });
  client.setQueryData(queryKeys.invites, [{ code: "private-invite" }]);

  const persisted = dehydrate(client, { shouldDehydrateQuery: shouldPersistQuery }).queries.map((q) => q.queryKey);
  expect(persisted).toEqual([queryKeys.places]);
});
