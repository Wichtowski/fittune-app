import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPinIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { PlaceForm } from "./place-form";
import { equipmentSummary } from "../format";
import { MAX_PLACES, placeKindLabels } from "../presets";
import { archivePlace, placesQuery } from "@/api/places";
import { queryKeys } from "@/api/query-keys";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { newId } from "@/lib/id";
import type { Place } from "@/schemas/place";

export function PlacePicker({ value, onChange }: { value: Place | null | undefined; onChange: (place: Place) => void }) {
  const query = useQuery(placesQuery());
  const [dialog, setDialog] = useState<"list" | "add" | null>(null);
  const id = useId();
  const places = query.data ?? [];
  const savedSetup = value && !places.some((place) => place.version_id === value.version_id);

  const pick = (versionId: string) => {
    const next = places.find((place) => place.version_id === versionId) ?? (versionId === value?.version_id ? value : undefined);
    if (next) onChange(next);
  };

  return (
    <section className="mb-4 rounded-2xl border bg-card p-4" aria-label="Workout place">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium"><MapPinIcon className="size-4 text-primary-strong" aria-hidden />Workout place</label>
        {places.length ? <Button variant="ghost" size="sm" onClick={() => setDialog("list")}>Manage places</Button> : null}
      </div>
      {query.data && !places.length ? (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">Add where you train before your first workout. Each place keeps its own equipment, so exercises match what you have.</p>
          <Button onClick={() => setDialog("add")}><PlusIcon className="size-4" aria-hidden />Add your first place</Button>
        </div>
      ) : (
        <>
          <Select value={value?.version_id} onValueChange={pick}>
            <SelectTrigger id={id}><SelectValue placeholder="Choose a place" /></SelectTrigger>
            <SelectContent>
              {savedSetup ? <SelectItem value={value.version_id}>{value.name} (saved setup)</SelectItem> : null}
              {places.map((place) => <SelectItem key={place.id} value={place.version_id}>{place.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">{value ? equipmentSummary(value) : "Choose a place to match exercises to the equipment available."}</p>
          {savedSetup && query.data ? <p className="mt-2 text-xs text-muted-foreground">This workout keeps its saved setup. Select another setup to change it.</p> : null}
        </>
      )}
      {query.error && !query.data ? <QueryError error={query.error} onRetry={() => void query.refetch()} /> : null}
      {query.isPending ? <p className="mt-2 text-xs text-muted-foreground">{query.fetchStatus === "paused" ? "No cached places yet. Connect to load them." : "Loading places…"}</p> : null}
      {/* Keyed by mode so the dialog starts in the add form for a first place */}
      <PlacesDialog key={dialog === "add" ? "add" : "list"} open={dialog !== null} startAdding={dialog === "add"} onOpenChange={(open) => setDialog(open ? "list" : null)} />
    </section>
  );
}

function PlacesDialog({ open, startAdding, onOpenChange }: { open: boolean; startAdding: boolean; onOpenChange: (open: boolean) => void }) {
  const query = useQuery(placesQuery());
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const [editor, setEditor] = useState<{ id: string; place?: Place } | null>(() => (startAdding ? { id: newId() } : null));
  const [archiving, setArchiving] = useState<string | null>(null);
  const archive = useMutation({
    mutationFn: archivePlace,
    onSuccess: (_, id) => {
      queryClient.setQueryData<Place[]>(queryKeys.places, (current = []) => current.filter((place) => place.id !== id));
      void queryClient.invalidateQueries({ queryKey: queryKeys.places });
      setArchiving(null);
      toast.success("Place archived. Workouts keep their saved setup.");
    },
    onError: () => toast.error("Couldn't archive this place. Try again."),
  });
  const atLimit = (query.data?.length ?? 0) >= MAX_PLACES;
  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) { setEditor(null); setArchiving(null); }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={close} title={editor ? editor.place ? "Edit place" : "Add place" : "Workout places"} description="Save the equipment available at each place you train.">
      {editor ? (
        <div className="grid gap-3">
          <PlaceForm key={editor.id} id={editor.id} place={editor.place} onDone={() => (startAdding ? close(false) : setEditor(null))} />
          <Button variant="ghost" onClick={() => setEditor(null)}>Back to places</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {!online ? <p className="text-sm text-muted-foreground">Cached places are available for workouts. Connect to add, edit, or archive places.</p> : null}
          {query.error && !query.data ? <QueryError error={query.error} onRetry={() => void query.refetch()} /> : null}
          <ul className="grid max-h-[50dvh] gap-3 overflow-y-auto">
            {query.data?.map((place) => (
              <li key={place.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="break-words font-medium">{place.name}</p><p className="text-xs text-muted-foreground">{placeKindLabels[place.kind]}</p></div>
                  <Button variant="ghost" size="icon-sm" aria-label={`Edit ${place.name}`} disabled={!online || archive.isPending} onClick={() => setEditor({ id: place.id, place })}><PencilIcon className="size-4" aria-hidden /></Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{equipmentSummary(place)}</p>
                {archiving === place.id ? (
                  <div className="mt-2 grid gap-2">
                    <p className="text-xs text-muted-foreground">Archive this place? Existing workouts keep their setup.</p>
                    <div className="flex gap-2"><Button size="sm" variant="destructive" disabled={!online || archive.isPending} onClick={() => archive.mutate(place.id)}>Confirm archive</Button><Button size="sm" variant="ghost" onClick={() => setArchiving(null)}>Cancel</Button></div>
                  </div>
                ) : <Button className="mt-2" size="sm" variant="ghost" disabled={!online || archive.isPending} onClick={() => setArchiving(place.id)}>Archive</Button>}
              </li>
            ))}
          </ul>
          {query.data?.length === 0 ? <p className="text-sm text-muted-foreground">Add Home, Gym, or a custom setup. Each place has its own equipment list.</p> : null}
          {atLimit ? <p className="text-sm text-muted-foreground">You can keep up to {MAX_PLACES} places. Archive one to add another.</p> : null}
          <Button disabled={!online || archive.isPending || atLimit} onClick={() => setEditor({ id: newId() })}><PlusIcon className="size-4" aria-hidden />Add place</Button>
        </div>
      )}
    </ResponsiveDialog>
  );
}
