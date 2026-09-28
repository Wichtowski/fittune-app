import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Parent of every FitHealth page */
export const Route = createFileRoute("/_app/health")({
  staticData: { app: "health" },
  component: Outlet,
});
