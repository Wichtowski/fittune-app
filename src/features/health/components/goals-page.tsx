import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { BodyProfileForm } from "./body-profile-form";
import { MealEditor } from "./meal-editor";
import { WeightLog } from "./weight-log";
import { formatAmount } from "../nutrition";
import { dayQuery, profileQuery } from "@/api/health";
import { PageHeader } from "@/components/layout/page-header";
import { QueryFallback } from "@/components/query-error";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toDateString } from "@/lib/dates";
import { t } from "@/lib/i18n";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 font-display text-xl font-bold tracking-wide uppercase">{title}</h2>
      {children}
    </Card>
  );
}

const missingCopy = {
  profile: "Fill in your body details below.",
  birthday: "Add your birthday in Profile, age changes the calculation.",
  weight: "Log your weight below.",
} as const;

/** Today's targets with what they are made of, so the numbers are never a mystery */
function TodayTargets() {
  const day = useQuery(dayQuery(toDateString(new Date())));
  if (!day.data) return <QueryFallback query={day}><Skeleton className="h-24" /></QueryFallback>;
  const { targets, missing, exercise } = day.data;

  return (
    <div className="grid gap-3">
      {targets ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            [t("Energy"), `${formatAmount(targets.energy_kcal, "kcal")} kcal`],
            [t("Protein"), `${formatAmount(targets.protein_g, "g")} g`],
            [t("Fat"), `${formatAmount(targets.fat_g, "g")} g`],
            [t("Carbs"), `${formatAmount(targets.carbs_g, "g")} g`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-muted p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-display text-2xl font-bold tabular">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {targets && exercise.energy_kcal > 0 ? (
        <p className="text-sm text-muted-foreground">{t("Includes {kcal} kcal from today's training.", { kcal: formatAmount(exercise.energy_kcal, "kcal") })}</p>
      ) : null}
      {missing.length > 0 ? (
        <ul className="grid gap-1 text-sm">
          {!targets ? <li className="font-medium">{t("To calculate your targets:")}</li> : <li className="font-medium">{t("To calculate them instead of using your own:")}</li>}
          {missing.map((item) => (
            <li key={item} className="text-muted-foreground">
              {t(missingCopy[item])}{" "}
              {item === "birthday" ? <Link to="/profile" className="font-medium text-primary-strong underline-offset-4 hover:underline">{t("Open Profile")}</Link> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function GoalsPage() {
  const profile = useQuery(profileQuery());

  return (
    <>
      <PageHeader eyebrow="FitHealth" title={t("Goals")} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-6">
          <Section title={t("Today's targets")}><TodayTargets /></Section>
          <Section title={t("Body weight")}><WeightLog /></Section>
          <Section title={t("Meals")}><MealEditor /></Section>
        </div>
        <Section title={t("Body and goal")}>
          {profile.data ? (
            <BodyProfileForm profile={profile.data} />
          ) : (
            <QueryFallback query={profile}><Skeleton className="h-96" /></QueryFallback>
          )}
        </Section>
      </div>
    </>
  );
}
