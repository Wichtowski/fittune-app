import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { account } from "@/api/account";
import { fittune } from "@/api/fittune";
import { PageHeader } from "@/components/layout/page-header";
import { LoadMore } from "@/components/load-more";
import { QueryFallback } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseForm } from "@/features/exercises/components/exercise-form";
import { CreateInvite } from "@/features/invites/components/create-invite";
import { InviteList } from "@/features/invites/components/invite-list";
import { useIncrementalList } from "@/hooks/use-incremental-list";
import { t } from "@/lib/i18n";
import type { Exercise } from "@/schemas/exercise";

export function AdminPage() {
  const client = useQueryClient();
  const settings = useQuery({ queryKey: ["admin", "ocr"], queryFn: ({ signal }) => account.getOcrSettings(signal), retry: false });
  const [offset, setOffset] = useState(0);
  const users = useQuery({ queryKey: ["admin", "users", offset], queryFn: ({ signal }) => account.listUsers(offset, signal), retry: false });
  const exercises = useQuery({ queryKey: ["admin", "catalogue"], queryFn: ({ signal }) => fittune.getExercises(signal), retry: false });
  const [model, setModel] = useState<string>();
  const [editing, setEditing] = useState<Exercise | "new" | null>(null);
  const [archiving, setArchiving] = useState<Exercise | null>(null);
  const [search, setSearch] = useState("");
  const matching = useMemo(() => (exercises.data ?? []).filter((exercise) => exercise.name.toLowerCase().includes(search.toLowerCase())), [exercises.data, search]);
  const catalogue = useMemo(() => matching.filter((exercise) => !exercise.is_custom), [matching]);
  // Admins see every exercise users created, including the private ones from before sharing
  const created = useMemo(() => matching.filter((exercise) => exercise.is_custom), [matching]);
  const { shown, hasMore, showMore } = useIncrementalList(catalogue);
  const closeEditor = () => { setEditing(null); void client.invalidateQueries({ queryKey: ["admin", "catalogue"] }); };
  const save = useMutation({ mutationFn: account.setOcrModel, retry: false, onSuccess: (next) => { client.setQueryData(["admin", "ocr"], next); setModel(undefined); } });
  const archive = useMutation({ mutationFn: fittune.archiveExercise, retry: false, onSuccess: () => { setArchiving(null); void client.invalidateQueries({ queryKey: ["admin", "catalogue"] }); void client.invalidateQueries({ queryKey: ["exercises"] }); } });
  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <PageHeader title={t("Admin panel")} />
      <Card className="grid gap-3 p-5">
        <h2 className="text-xl font-medium">{t("Nutrition label AI")}</h2>
        <QueryFallback query={settings}>{settings.data ? <>
          <p className="text-sm">{t("Global model for all users. Only administrators can change it.")}</p>
          <label className="grid gap-2 text-sm">{t("OpenAI model")}<select className="h-10 rounded-md border bg-background px-3" value={model ?? settings.data.ocr_model} disabled={save.isPending} onChange={(event) => setModel(event.target.value)}>{settings.data.models.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <p className="text-sm text-muted-foreground">{settings.data.ai_configured ? t("OpenAI is configured") : t("OpenAI is disabled: server API key is missing")}</p>
          <p className="text-sm text-muted-foreground">{settings.data.server_ocr_configured ? t("Server OCR is configured") : t("Server OCR is disabled")}</p>
          <p className="break-all text-xs text-muted-foreground">{t("Last changed")}: {settings.data.updated_at}{settings.data.updated_by ? ` (${settings.data.updated_by})` : ""}</p>
          <Button disabled={!model || save.isPending} onClick={() => model && save.mutate(model)}>{t("Save model")}</Button>
        </> : null}</QueryFallback>
        {save.error ? <p role="alert" className="text-sm text-destructive">{save.error.message}</p> : null}
      </Card>
      <Card className="grid gap-4 p-5"><h2 className="text-xl font-medium">{t("Invites")}</h2><CreateInvite /><InviteList /></Card>
      <Card className="grid gap-3 p-5"><h2 className="text-xl font-medium">{t("Users")}</h2><QueryFallback query={users}><ul className="divide-y">{users.data?.map((user) => <li key={user.id} className="py-2 text-sm"><span className="font-medium">@{user.username}</span> · {user.role}<p className="break-all text-muted-foreground">{user.email}</p></li>)}</ul>{hasMore ? <LoadMore key={shown.length} onLoadMore={showMore} /> : null}</QueryFallback>
        <h2 className="pt-2 text-xl font-medium">{t("Created by users")}</h2>
        {created.length === 0 ? <p className="text-sm text-muted-foreground">{t("No exercises")}</p> : <ul className="divide-y">{created.map((exercise) => <li key={exercise.id} className="flex flex-wrap items-center gap-2 py-2"><span className="min-w-0 flex-1 text-sm"><span className="block truncate">{exercise.name}</span><span className="block truncate text-xs text-muted-foreground">{exercise.created_by ? t("Created by {name}", { name: exercise.created_by }) : t("Custom")}</span></span><Button size="sm" variant="outline" onClick={() => setEditing(exercise)}>{t("Edit")}</Button><Button size="sm" variant="outline" onClick={() => setArchiving(exercise)}>{t("Archive")}</Button></li>)}</ul>}<div className="flex justify-between gap-2"><Button variant="outline" disabled={offset === 0 || users.isFetching} onClick={() => setOffset((n) => Math.max(0, n - 50))}>{t("Previous")}</Button><Button variant="outline" disabled={users.isFetching || (users.data?.length ?? 0) < 50} onClick={() => setOffset((n) => n + 50)}>{t("Next")}</Button></div></Card>
      <Card className="grid gap-3 p-5">
        <h2 className="text-xl font-medium">{t("Exercise catalogue")}</h2>
        <Button onClick={() => setEditing("new")}>{t("Create catalogue exercise")}</Button>
        <Input aria-label={t("Search exercises")} placeholder={t("Search exercises")} value={search} onChange={(event) => setSearch(event.target.value)} />
        <QueryFallback query={exercises}><ul className="divide-y">{shown.map((exercise) => <li key={exercise.id} className="flex flex-wrap items-center gap-2 py-2"><span className="min-w-0 flex-1 text-sm">{exercise.name}</span><Button size="sm" variant="outline" onClick={() => setEditing(exercise)}>{t("Edit")}</Button><Button size="sm" variant="outline" onClick={() => setArchiving(exercise)}>{t("Archive")}</Button></li>)}</ul></QueryFallback>
      </Card>
      <ResponsiveDialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }} title={t("Exercise catalogue")} className="max-h-[90dvh] overflow-y-auto">{editing === "new" ? <ExerciseForm key="new" catalog onDone={closeEditor} /> : editing ? <CatalogueExerciseEditor key={editing.id} id={editing.id} catalog={!editing.is_custom} onDone={closeEditor} /> : null}</ResponsiveDialog>
      <ResponsiveDialog open={archiving !== null} onOpenChange={(open) => { if (!open) setArchiving(null); }} title={t("Archive exercise")}><p className="mb-3 text-sm">{archiving?.name}</p>{archive.error ? <p role="alert" className="text-sm text-destructive">{archive.error.message}</p> : null}<Button variant="destructive" disabled={archive.isPending} onClick={() => archiving && archive.mutate(archiving.id)}>{t("Confirm archive")}</Button></ResponsiveDialog>
    </div>
  );
}

/**
 * The catalogue list leaves out instruction texts, and saving the form replaces the whole
 * exercise, so the form is only shown once the full exercise is loaded
 */
function CatalogueExerciseEditor({ id, catalog, onDone }: { id: string; catalog: boolean; onDone: () => void }) {
  const exercise = useQuery({ queryKey: ["admin", "catalogue", id], queryFn: ({ signal }) => fittune.getExercise(id, signal), retry: false, gcTime: 0 });
  if (!exercise.data) return <QueryFallback query={exercise}><Skeleton className="h-64" /></QueryFallback>;
  return <ExerciseForm catalog={catalog} exercise={exercise.data} onDone={onDone} />;
}
