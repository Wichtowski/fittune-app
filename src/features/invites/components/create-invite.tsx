import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CopyIcon, LinkIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createInvite } from "@/api/invites";
import { queryKeys } from "@/api/query-keys";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyServerErrors } from "@/lib/form-errors";
import { t } from "@/lib/i18n";
import { type InviteInput, inviteInputSchema } from "@/schemas/invite";

const EXPIRY_DAYS = [1, 7, 30, 90];
const MAX_USES = [1, 5, 10];

export function CreateInvite() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState<string | null>(null);
  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteInputSchema),
    defaultValues: { note: "", expires_in_days: 7, max_uses: 1 },
  });
  const mutation = useMutation({
    mutationFn: createInvite,
    onSuccess: (created) => {
      setCode(created.code);
      form.reset();
      void queryClient.invalidateQueries({ queryKey: queryKeys.invites });
    },
    onError: (error) => applyServerErrors(error, form.setError),
  });

  if (code) return <NewCode code={code} onDone={() => setCode(null)} />;

  return (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate>
        <FormField control={form.control} name="note" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("Who is it for? (optional)")}</FormLabel>
            <FormControl><Input placeholder={t("e.g. Ala from the gym")} maxLength={120} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="expires_in_days" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Expires after")}</FormLabel>
              <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>{EXPIRY_DAYS.map((days) => <SelectItem key={days} value={String(days)}>{days === 1 ? t("1 day") : t("{count} days", { count: days })}</SelectItem>)}</SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="max_uses" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Can be used")}</FormLabel>
              <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>{MAX_USES.map((uses) => <SelectItem key={uses} value={String(uses)}>{uses === 1 ? t("Once") : t("{count} times", { count: uses })}</SelectItem>)}</SelectContent>
              </Select>
            </FormItem>
          )} />
        </div>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? t("Creating…") : t("Create invite")}</Button>
      </form>
    </Form>
  );
}

function NewCode({ code, onDone }: { code: string; onDone: () => void }) {
  const link = `${window.location.origin}/register?invite=${encodeURIComponent(code)}`;
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("{what} copied", { what }));
    } catch {
      toast.error(t("Couldn't copy. Select the code and copy it manually."));
    }
  };

  return (
    <div className="grid gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4">
      <p className="text-sm font-medium">{t("New invite code")}</p>
      <p className="font-mono text-lg break-all select-all">{code}</p>
      <p className="text-xs text-muted-foreground">{t("Copy it now. For security the code is not stored and won't be shown again.")}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => void copy(code, t("Code"))}><CopyIcon className="size-4" aria-hidden />{t("Copy code")}</Button>
        <Button size="sm" variant="secondary" onClick={() => void copy(link, t("Invite link"))}><LinkIcon className="size-4" aria-hidden />{t("Copy invite link")}</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>{t("Done")}</Button>
      </div>
    </div>
  );
}
