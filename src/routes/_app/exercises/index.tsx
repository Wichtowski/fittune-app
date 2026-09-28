import { t } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { exercisesQuery } from "@/api/exercises";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ExerciseForm } from "@/features/exercises/components/exercise-form";
import { ExerciseLibrary } from "@/features/exercises/components/exercise-library";
import { equipmentSchema, muscleSchema } from "@/schemas/common";

export const Route = createFileRoute("/_app/exercises/")({
  staticData: { app: "train" },
  validateSearch: z.object({
    q: z.string().optional(),
    muscle: muscleSchema.optional().catch(undefined),
    equipment: equipmentSchema.optional().catch(undefined),
  }),
  loader: ({ context }) => void context.queryClient.prefetchQuery(exercisesQuery()),
  component: ExercisesPage,
});

function ExercisesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title={t("Exercises")}
        eyebrow={t("Library & custom movements")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon aria-hidden /> <span className="hidden sm:inline">{t("Custom exercise")}</span>
            <span className="sm:hidden">{t("New")}</span>
          </Button>
        }
      />
      <ExerciseLibrary filter={search} onFilterChange={(filter) => void navigate({ search: filter, replace: true })} />
      <ResponsiveDialog open={creating} onOpenChange={setCreating} title={t("New custom exercise")}>
        <ExerciseForm
          onDone={(exercise) => {
            setCreating(false);
            void navigate({ to: "/exercises/$exerciseId", params: { exerciseId: exercise.id } });
          }}
        />
      </ResponsiveDialog>
    </>
  );
}
