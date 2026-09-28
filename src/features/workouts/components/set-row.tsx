import { t } from "@/lib/i18n";
import { CheckIcon, Trash2Icon } from "lucide-react";
import { memo } from "react";

import type { DraftSet } from "../draft";
import { DurationField, NumberField } from "@/components/number-field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setKindLabels } from "@/lib/labels";
import { kgTo, metresTo, toKg, toMetres } from "@/lib/units";
import { cn } from "@/lib/utils";
import { type DistanceUnit, SET_KINDS, type SetKind, type Tracking, type WeightUnit } from "@/schemas/common";

type SetRowProps = {
  set: DraftSet;
  /** 1-based number among working sets; warm-ups show "W" instead. */
  label: string;
  tracking: Tracking;
  previous: string | null;
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  onChange: (setId: string, patch: Partial<Omit<DraftSet, "id">>) => void;
  onToggleComplete: (set: DraftSet) => void;
  onKind: (setId: string, kind: SetKind) => void;
  onRemove: (setId: string) => void;
  onUsePrevious: (setId: string) => void;
};

export const SET_GRID = "grid grid-cols-[2.5rem_minmax(0,1fr)_4.75rem_4.25rem_3rem] items-center gap-2";

/** One set: tap the number for type/delete, type values, tick to complete (starts rest). */
export const SetRow = memo(function SetRow({
  set,
  label,
  tracking,
  previous,
  weightUnit,
  distanceUnit,
  onChange,
  onToggleComplete,
  onKind,
  onRemove,
  onUsePrevious,
}: SetRowProps) {
  const kindTone =
    set.kind === "warmup" ? "text-endurance-strong" : set.kind === "normal" ? "text-foreground" : "text-destructive";

  return (
    <div
      className={cn(
        SET_GRID,
        "rounded-xl px-1.5 py-1 transition-colors",
        set.completed && "bg-primary/12 [&_input]:bg-transparent",
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex h-11 items-center justify-center rounded-lg font-display text-lg font-bold hover:bg-accent",
            kindTone,
          )}
          aria-label={t("Set {label} options", { label })}
        >
          {label}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>{t("Set type")}</DropdownMenuLabel>
          {SET_KINDS.map((kind) => (
            <DropdownMenuItem key={kind} onSelect={() => onKind(set.id, kind)}>
              <span className="w-4 font-display font-bold">{setKindLabels[kind].short || "1"}</span>
              {setKindLabels[kind].label}
              {set.kind === kind ? <CheckIcon className="ml-auto" aria-hidden /> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => onRemove(set.id)}>
            <Trash2Icon aria-hidden />{" "}{t("Delete set")}{" "}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        disabled={!previous}
        onClick={() => onUsePrevious(set.id)}
        className="h-11 truncate rounded-lg px-1 text-left text-sm text-muted-foreground tabular enabled:hover:bg-accent disabled:opacity-40"
        aria-label={previous ? t("Use previous: {value}", { value: previous }) : t("No previous set")}
      >
        {previous ?? "-"}
      </button>

      {tracking === "weight_reps" ? (
        <>
          <NumberField
            aria-label={t("Weight ({unit})", { unit: weightUnit })}
            decimals
            max={2500}
            placeholder={weightUnit}
            value={set.weight_kg == null ? null : kgTo(weightUnit, set.weight_kg)}
            onValueChange={(v) => onChange(set.id, { weight_kg: v == null ? null : toKg(weightUnit, v) })}
          />
          <NumberField
            aria-label={t("Reps")}
            max={1000}
            placeholder={t("reps")}
            value={set.reps}
            onValueChange={(v) => onChange(set.id, { reps: v })}
          />
        </>
      ) : tracking === "reps" ? (
        <>
          <span aria-hidden />
          <NumberField
            aria-label={t("Reps")}
            max={1000}
            placeholder={t("reps")}
            value={set.reps}
            onValueChange={(v) => onChange(set.id, { reps: v })}
          />
        </>
      ) : tracking === "duration" ? (
        <>
          <span aria-hidden />
          <DurationField
            aria-label={t("Duration")}
            value={set.duration_seconds}
            onValueChange={(v) => onChange(set.id, { duration_seconds: v })}
          />
        </>
      ) : (
        <>
          <NumberField
            aria-label={t("Distance ({unit})", { unit: distanceUnit })}
            decimals
            max={1000}
            placeholder={distanceUnit}
            value={set.distance_m == null ? null : metresTo(distanceUnit, set.distance_m)}
            onValueChange={(v) => onChange(set.id, { distance_m: v == null ? null : toMetres(distanceUnit, v) })}
          />
          <DurationField
            aria-label={t("Duration")}
            value={set.duration_seconds}
            onValueChange={(v) => onChange(set.id, { duration_seconds: v })}
          />
        </>
      )}

      <button
        type="button"
        aria-pressed={set.completed}
        aria-label={set.completed ? `Mark set ${label} not done` : `Complete set ${label}`}
        onClick={() => onToggleComplete(set)}
        className={cn(
          "flex size-11 items-center justify-center justify-self-end rounded-xl border-2 transition-all active:scale-90",
          set.completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input text-muted-foreground/60 hover:border-primary/60",
        )}
      >
        <CheckIcon className="size-5" strokeWidth={3} aria-hidden />
      </button>
    </div>
  );
});
