import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { request } from "./client";
import { queryKeys } from "./query-keys";
import { type RoutineInput, routineSchema } from "@/schemas/routine";

export const routinesQuery = () =>
  queryOptions({
    queryKey: queryKeys.routines.list,
    queryFn: ({ signal }) => request("/routines", { schema: z.array(routineSchema), signal }),
  });

export const routineQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.routines.detail(id),
    queryFn: ({ signal }) => request(`/routines/${id}`, { schema: routineSchema, signal }),
  });

export const createRoutine = (input: RoutineInput) =>
  request("/routines", { method: "POST", body: input, schema: routineSchema });

export const updateRoutine = (id: string, input: RoutineInput) =>
  request(`/routines/${id}`, { method: "PUT", body: input, schema: routineSchema });

export const deleteRoutine = (id: string) => request(`/routines/${id}`, { method: "DELETE" });
