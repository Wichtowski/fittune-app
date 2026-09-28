import { Slot } from "radix-ui";
import * as React from "react";
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
  useFormState,
} from "react-hook-form";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const Form = FormProvider;

type FormFieldContextValue = { name: string };
const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);
const FormItemContext = React.createContext<{ id: string } | null>(null);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>(props: ControllerProps<TFieldValues, TName, TTransformedValues>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

function useFormField() {
  const field = React.useContext(FormFieldContext);
  const item = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: field?.name });
  if (!field || !item) {
    throw new Error("useFormField must be used within <FormField> and <FormItem>");
  }
  const state = getFieldState(field.name, formState);
  return {
    name: field.name,
    formItemId: `${item.id}-item`,
    formDescriptionId: `${item.id}-description`,
    formMessageId: `${item.id}-message`,
    ...state,
  };
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn("grid gap-2", className)} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();
  return <Label data-error={!!error} className={cn("data-[error=true]:text-destructive", className)} htmlFor={formItemId} {...props} />;
}

function FormControl(props: React.ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return (
    <Slot.Root
      id={formItemId}
      aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId}
      aria-invalid={!!error}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();
  return <p id={formDescriptionId} className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

function FormMessage({ className, children, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message ?? "") : children;
  if (!body) return null;
  return (
    <p id={formMessageId} role="alert" className={cn("text-sm text-destructive", className)} {...props}>
      {typeof body === "string" ? t(body) : body}
    </p>
  );
}

export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage };
