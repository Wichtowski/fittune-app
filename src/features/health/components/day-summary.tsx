import { Link } from "@tanstack/react-router";
import { DumbbellIcon, TargetIcon } from "lucide-react";

import { formatAmount, progress } from "../nutrition";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Day } from "@/schemas/health";

function Bar({ ratio, over, className }: { ratio: number; over: boolean; className?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full bg-primary transition-[width]", over && "bg-endurance", className)} style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

function Macro({ label, eaten, target }: { label: string; eaten: number; target?: number }) {
  const { ratio, over } = progress(eaten, target);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular">
          <span className="font-semibold">{formatAmount(eaten, "g")}</span>
          {target !== undefined ? <span className="text-muted-foreground"> / {formatAmount(target, "g")} g</span> : " g"}
        </span>
      </div>
      <Bar ratio={ratio} over={over} />
    </div>
  );
}

/** Calories and macros eaten against the day's targets, and what training added */
export function DaySummary({ day }: { day: Day }) {
  const targets = day.targets ?? undefined;
  const energy = progress(day.totals.energy_kcal, targets?.energy_kcal);
  const trained = day.exercise.workouts + day.exercise.activities > 0;

  return (
    <Card className="mb-6 grid gap-5 p-5">
      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{t("Eaten")}</p>
            <p className="font-display text-4xl font-bold tabular">
              {formatAmount(day.totals.energy_kcal, "kcal")}
              {targets ? <span className="text-xl text-muted-foreground"> / {formatAmount(targets.energy_kcal, "kcal")}</span> : null}
              <span className="text-xl text-muted-foreground"> kcal</span>
            </p>
          </div>
          {energy.left !== null ? (
            <p className={cn("text-right text-sm font-semibold", energy.over ? "text-endurance-strong" : "text-primary-strong")}>
              {energy.over ? t("{kcal} kcal over", { kcal: formatAmount(-energy.left, "kcal") }) : t("{kcal} kcal left", { kcal: formatAmount(energy.left, "kcal") })}
            </p>
          ) : null}
        </div>
        <Bar ratio={energy.ratio} over={energy.over} className="h-3" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Macro label={t("Protein")} eaten={day.totals.protein_g} target={targets?.protein_g} />
        <Macro label={t("Fat")} eaten={day.totals.fat_g} target={targets?.fat_g} />
        <Macro label={t("Carbs")} eaten={day.totals.carbs_g} target={targets?.carbs_g} />
      </div>

      {trained ? (
        <p className="flex items-center gap-2 text-sm">
          <DumbbellIcon className="size-4 shrink-0 text-primary-strong" aria-hidden />
          {day.exercise.energy_kcal > 0
            ? t("+{kcal} kcal from today's training", { kcal: formatAmount(day.exercise.energy_kcal, "kcal") })
            : t("Log your weight to count today's training")}
        </p>
      ) : null}

      {day.missing.length > 0 && !targets ? (
        <p className="flex items-start gap-2 rounded-xl bg-muted p-3 text-sm">
          <TargetIcon className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden />
          <span>
            {t("Set up your goals to get daily targets.")}{" "}
            <Link to="/health/goals" className="font-medium text-primary-strong underline-offset-4 hover:underline">{t("Set up goals")}</Link>
          </span>
        </p>
      ) : null}
    </Card>
  );
}
