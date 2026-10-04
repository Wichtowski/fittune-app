import { t } from "@/lib/i18n";
import { CheckIcon, MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { memo, type ReactNode } from "react";

import type { DraftSet } from "../draft";
import { stepValue } from "../weight-step";
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
  /** How far − and + move the weight, in `weightUnit` */
  weightStep: number;
  onChange: (setId: string, patch: Partial<Omit<DraftSet, "id">>) => void;
  onToggleComplete: (set: DraftSet) => void;
  onKind: (setId: string, kind: SetKind) => void;
  onRemove: (setId: string) => void;
  onUsePrevious: (setId: string) => void;
};

const MAX_WEIGHT = 2500;
const MAX_REPS = 1000;

/**
 * Set number, previous set, the two values and the tick. A phone is too narrow for values with
 * − and + buttons on that line, so there the values take a second line under the other three.
 */
export const SET_GRID =
  "grid grid-cols-[2.5rem_minmax(0,1fr)_3rem] items-center gap-x-2 gap-y-1 sm:grid-cols-[2.5rem_minmax(0,1fr)_21rem_3rem]";
/** The two values, shared with the column headings so they line up */
export const SET_VALUES = "col-span-3 row-start-2 grid grid-cols-2 gap-2 sm:col-span-1 sm:col-start-3 sm:row-start-1";
const SET_DONE = "col-start-3 row-start-1 sm:col-start-4";

/** A value with a button on each side that moves it by `step` */
function Stepper({
  label,
  caption,
  value,
  step,
  max,
  onStep,
  children,
}: {
  label: string;
  /** Shown above the field on phones, where the column headings are hidden */
  caption: string;
  value: number | null;
  step: number;
  max: number;
  onStep: (next: number) => void;
  children: ReactNode;
}) {
  const button = "flex h-11 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground transition-transform hover:bg-accent hover:text-foreground active:scale-90 disabled:opacity-40";
  return (
    <div className="min-w-0">
      <span className="mb-0.5 block text-center text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase sm:hidden" aria-hidden>
        {caption}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={button}
          disabled={(value ?? 0) <= 0}
          onClick={() => onStep(stepValue(value, -step, max))}
          aria-label={t("Decrease {field} by {step}", { field: label, step })}
        >
          <MinusIcon className="size-4" aria-hidden />
        </button>
        {children}
        <button
          type="button"
          className={button}
          disabled={(value ?? 0) >= max}
          onClick={() => onStep(stepValue(value, step, max))}
          aria-label={t("Increase {field} by {step}", { field: label, step })}
        >
          <PlusIcon className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** A value without steps, captioned on phones like the stepped ones */
function Plain({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="mb-0.5 block text-center text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase sm:hidden" aria-hidden>
        {caption}
      </span>
      {children}
    </div>
  );
}

/** One set: tap the number for type/delete, type or step the values, tick to complete (starts rest). */
export const SetRow = memo(function SetRow({
  set,
  label,
  tracking,
  previous,
  weightUnit,
  distanceUnit,
  weightStep,
  onChange,
  onToggleComplete,
  onKind,
  onRemove,
  onUsePrevious,
}: SetRowProps) {
  const kindTone =
    set.kind === "warmup" ? "text-endurance-strong" : set.kind === "normal" ? "text-foreground" : "text-destructive";
  const weight = set.weight_kg == null ? null : kgTo(weightUnit, set.weight_kg);
  const weightLabel = t("Weight ({unit})", { unit: weightUnit });
  const setWeight = (value: number | null) => onChange(set.id, { weight_kg: value == null ? null : toKg(weightUnit, value) });
  const setReps = (value: number | null) => onChange(set.id, { reps: value });

  const reps = (
    <Stepper label={t("Reps")} caption={t("Reps")} value={set.reps} step={1} max={MAX_REPS} onStep={setReps}>
      <NumberField aria-label={t("Reps")} max={MAX_REPS} placeholder="–" value={set.reps} onValueChange={setReps} />
    </Stepper>
  );
  const duration = (
    <Plain caption={t("Time")}>
      <DurationField
        aria-label={t("Duration")}
        value={set.duration_seconds}
        onValueChange={(v) => onChange(set.id, { duration_seconds: v })}
      />
    </Plain>
  );

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
        {/* Opens beside the set number, so the values of this set stay in view while choosing */}
        <DropdownMenuContent side="top" align="start">
          <DropdownMenuLabel>{t("Set type")}</DropdownMenuLabel>
          {SET_KINDS.map((kind) => (
            <DropdownMenuItem key={kind} onSelect={() => onKind(set.id, kind)}>
              <span className="w-4 font-display font-bold">{setKindLabels[kind].short || "1"}</span>
              {t(setKindLabels[kind].label)}
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

      <div className={cn(SET_VALUES, (tracking === "reps" || tracking === "duration") && "grid-cols-1 sm:grid-cols-2 sm:[&>*]:col-start-2")}>
        {tracking === "weight_reps" ? (
          <>
            <Stepper label={weightLabel} caption={weightUnit} value={weight} step={weightStep} max={MAX_WEIGHT} onStep={setWeight}>
              <NumberField aria-label={weightLabel} decimals max={MAX_WEIGHT} placeholder="–" value={weight} onValueChange={setWeight} />
            </Stepper>
            {reps}
          </>
        ) : tracking === "reps" ? (
          reps
        ) : tracking === "duration" ? (
          duration
        ) : (
          <>
            <Plain caption={distanceUnit}>
              <NumberField
                aria-label={t("Distance ({unit})", { unit: distanceUnit })}
                decimals
                max={1000}
                placeholder="–"
                value={set.distance_m == null ? null : metresTo(distanceUnit, set.distance_m)}
                onValueChange={(v) => onChange(set.id, { distance_m: v == null ? null : toMetres(distanceUnit, v) })}
              />
            </Plain>
            {duration}
          </>
        )}
      </div>

      <button
        type="button"
        aria-pressed={set.completed}
        aria-label={set.completed ? t("Mark set {label} not done", { label }) : t("Complete set {label}", { label })}
        onClick={() => onToggleComplete(set)}
        className={cn(
          SET_DONE,
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
