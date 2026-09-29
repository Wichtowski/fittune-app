import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AddFoodDialog } from "./add-food-dialog";
import { DateBar } from "./date-bar";
import { DaySummary } from "./day-summary";
import { EntryDialog } from "./entry-dialog";
import { MealCard } from "./meal-card";
import { dayQuery } from "@/api/health";
import { PageHeader } from "@/components/layout/page-header";
import { QueryFallback } from "@/components/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";
import type { Entry } from "@/schemas/health";

/** The food diary for one day */
export function DiaryPage({ date, onDateChange }: { date: string; onDateChange: (date: string) => void }) {
  const day = useQuery(dayQuery(date));
  const [adding, setAdding] = useState<{ id: string; name: string } | null>(null);
  const [editing, setEditing] = useState<Entry | null>(null);

  return (
    <>
      <PageHeader eyebrow="FitHealth" title={t("Diary")} />
      <DateBar date={date} onChange={onDateChange} />
      {day.data ? (
        <>
          <DaySummary day={day.data} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {day.data.meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} onAdd={() => setAdding({ id: meal.id, name: meal.name })} onEdit={setEditing} />
            ))}
          </div>
        </>
      ) : (
        <QueryFallback query={day}>
          <div className="grid gap-4"><Skeleton className="h-48" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        </QueryFallback>
      )}
      {adding ? <AddFoodDialog open onOpenChange={(open) => !open && setAdding(null)} date={date} meal={adding} /> : null}
      <EntryDialog entry={editing} onOpenChange={(open) => !open && setEditing(null)} />
    </>
  );
}
