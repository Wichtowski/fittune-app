import * as React from "react";

import { cn } from "@/lib/utils";

type NumberFieldProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number | null;
  onValueChange: (value: number | null) => void;
  /** Allow decimals (weights, distances) or only whole numbers (reps). */
  decimals?: boolean;
  min?: number;
  max?: number;
};

function parse(text: string, decimals: boolean): number | null {
  const normalised = text.replace(",", ".").trim();
  if (normalised === "" || normalised === ".") return null;
  const value = decimals ? Number.parseFloat(normalised) : Number.parseInt(normalised, 10);
  return Number.isFinite(value) ? value : null;
}

function display(value: number | null): string {
  return value == null ? "" : String(Math.round(value * 100) / 100);
}

/**
 * Numeric input tuned for logging sets: numeric keypad, select-all on focus, commas accepted
 * as decimal separators, and every keystroke committed immediately (no save button).
 */
export function NumberField({
  value,
  onValueChange,
  decimals = false,
  min = 0,
  max,
  className,
  onFocus,
  onBlur,
  ...props
}: NumberFieldProps) {
  const [text, setText] = React.useState(() => display(value));
  const focused = React.useRef(false);

  // Follow external changes (e.g. "copy previous") unless the user is typing.
  React.useEffect(() => {
    if (!focused.current) setText(display(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode={decimals ? "decimal" : "numeric"}
      autoComplete="off"
      enterKeyHint="next"
      value={text}
      onFocus={(event) => {
        focused.current = true;
        event.currentTarget.select();
        onFocus?.(event);
      }}
      onBlur={(event) => {
        focused.current = false;
        setText(display(value));
        onBlur?.(event);
      }}
      onChange={(event) => {
        const next = event.target.value;
        if (!(decimals ? /^\d*[.,]?\d{0,2}$/ : /^\d*$/).test(next)) return;
        setText(next);
        const parsed = parse(next, decimals);
        if (parsed == null) return onValueChange(null);
        const clamped = Math.max(min, max == null ? parsed : Math.min(max, parsed));
        onValueChange(clamped);
      }}
      className={cn(
        "h-11 w-full min-w-0 rounded-lg bg-muted/70 text-center font-display text-xl font-semibold tabular outline-none placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground/50 focus:bg-background focus:ring-2 focus:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

/** "1:30" / "90" / "1:02:00" -> seconds. */
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(":").map((part) => (part === "" ? 0 : Number.parseInt(part, 10)));
  if (parts.length === 0 || parts.length > 3 || parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

export function formatDurationInput(seconds: number | null): string {
  if (seconds == null) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

type DurationFieldProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number | null;
  onValueChange: (seconds: number | null) => void;
};

/** Duration typed as m:ss (or h:mm:ss); commits on blur so partial input is not mangled. */
export function DurationField({ value, onValueChange, className, ...props }: DurationFieldProps) {
  const [text, setText] = React.useState(() => formatDurationInput(value));
  const focused = React.useRef(false);

  React.useEffect(() => {
    if (!focused.current) setText(formatDurationInput(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="m:ss"
      value={text}
      onFocus={(event) => {
        focused.current = true;
        event.currentTarget.select();
      }}
      onChange={(event) => {
        if (/^[\d:]*$/.test(event.target.value)) setText(event.target.value);
      }}
      onBlur={() => {
        focused.current = false;
        const seconds = text.trim() === "" ? null : parseDuration(text);
        const next = seconds == null ? null : Math.min(seconds, 86_400);
        onValueChange(next);
        setText(formatDurationInput(next));
      }}
      className={cn(
        "h-11 w-full min-w-0 rounded-lg bg-muted/70 text-center font-display text-xl font-semibold tabular outline-none placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground/50 focus:bg-background focus:ring-2 focus:ring-ring",
        className,
      )}
      {...props}
    />
  );
}
