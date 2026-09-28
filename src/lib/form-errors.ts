import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";

import { ApiError } from "@/api/client";
import { t } from "@/lib/i18n";

/**
 * Maps API validation errors onto form fields (the API reports `fields` keyed by the same
 * names), falling back to a toast for anything not tied to a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldMap: Partial<Record<string, Path<T>>> = {},
) {
  if (!(error instanceof ApiError)) {
    toast.error(t("Something went wrong. Please try again."));
    return;
  }
  const entries = Object.entries(error.fields);
  let mapped = false;
  for (const [field, message] of entries) {
    const target = fieldMap[field] ?? (field as Path<T>);
    setError(target, { type: "server", message });
    mapped = true;
  }
  if (!mapped) toast.error(t(error.message));
}
