import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { DiaryPage } from "@/features/health/components/diary-page";
import { toDateString } from "@/lib/dates";

export const Route = createFileRoute("/_app/health/")({
  validateSearch: z.object({ date: z.iso.date().optional().catch(undefined) }),
  component: Diary,
});

function Diary() {
  const { date = toDateString(new Date()) } = Route.useSearch();
  const navigate = Route.useNavigate();
  return <DiaryPage date={date} onDateChange={(next) => void navigate({ search: { date: next === toDateString(new Date()) ? undefined : next }, replace: true })} />;
}
