import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ProgressPhotoImage } from "./progress-photo";
import { fittune } from "@/api/fittune";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/use-online-status";

export const photoKeys = { all: ["progress-photos"] as const, workout: (id: string) => ["progress-photos", "workout", id] as const };

export function WorkoutPhotos({ workoutId, justCompleted, waitingForSync }: { workoutId: string; justCompleted: boolean; waitingForSync: boolean }) {
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const photos = useQuery({ queryKey: photoKeys.workout(workoutId), queryFn: () => fittune.listPhotos(workoutId), enabled: !waitingForSync });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState(() => crypto.randomUUID());
  const [progress, setProgress] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const upload = useMutation({
    mutationFn: () => fittune.uploadPhoto(uploadId, file!, workoutId, setProgress),
    onSuccess: () => {
      setFile(null);
      setPreview(null);
      setUploadId(crypto.randomUUID());
      setProgress(0);
      void queryClient.invalidateQueries({ queryKey: photoKeys.all });
      toast.success("Progress photo saved privately");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Photo upload failed"),
  });
  const remove = useMutation({
    mutationFn: fittune.deletePhoto,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: photoKeys.all }); toast.success("Photo deleted"); },
    onError: () => toast.error("Couldn't delete the photo"),
  });
  const choose = (selected?: File) => {
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) { toast.error("Choose an image under 10 MB"); return; }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setUploadId(crypto.randomUUID());
    setProgress(0);
  };
  const reset = () => {
    setFile(null); setPreview(null); setProgress(0);
  };

  return <section className="mt-6 rounded-2xl border bg-card p-4" aria-label="Progress photos">
    <h2 className="font-display text-xl font-bold tracking-wide uppercase">Progress photos</h2>
    <p className="mt-1 text-sm text-muted-foreground">Private to you. Add a photo now or return to this workout later.</p>
    {justCompleted && !skipped && !file ? <Button variant="ghost" size="sm" onClick={() => setSkipped(true)}>Skip for now</Button> : null}
    {skipped ? <Button className="mt-3" size="sm" variant="secondary" onClick={() => setSkipped(false)}>Add photo</Button> : <div className="mt-3 flex flex-wrap gap-2">
      <input ref={camera} type="file" accept="image/*" capture="user" className="sr-only" aria-label="Take progress photo" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} />
      <input ref={library} type="file" accept="image/*" className="sr-only" aria-label="Choose progress photo" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} />
      <Button size="sm" variant="secondary" onClick={() => camera.current?.click()}>Take photo</Button>
      <Button size="sm" variant="secondary" onClick={() => library.current?.click()}>Choose from library</Button>
    </div>}
    {preview ? <div className="mt-4 max-w-sm">
      <img src={preview} alt="Photo preview" className="max-h-80 w-full rounded-xl object-contain" />
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={() => upload.mutate()} disabled={!online || waitingForSync || upload.isPending}>Save photo</Button>
        <Button size="sm" variant="ghost" onClick={reset} disabled={upload.isPending}>Retake or cancel</Button>
      </div>
      {upload.isPending ? <p className="mt-1 text-sm">Uploading {progress}%…</p> : null}
      {!online || waitingForSync ? <p className="mt-1 text-sm text-muted-foreground">Connect and let the workout sync, then save this photo. You can also return later and choose it again.</p> : null}
    </div> : null}
    {photos.data?.length ? <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.data.map((photo) => <li key={photo.id} className="rounded-xl border p-2">
        <ProgressPhotoImage id={photo.id} className="aspect-square w-full rounded-lg object-cover" />
        <p className="mt-1 text-xs text-muted-foreground">{new Date(photo.taken_at).toLocaleDateString()}</p>
        <Button size="sm" variant="ghost" disabled={remove.isPending || !online} onClick={() => { if (window.confirm("Delete this progress photo?")) remove.mutate(photo.id); }}>Delete</Button>
      </li>)}
    </ul> : null}
  </section>;
}

export function ProgressGallery() {
  const photos = useInfiniteQuery({ queryKey: photoKeys.all, queryFn: ({ pageParam }) => fittune.listPhotos(undefined, pageParam), initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => lastPage.length === 100 ? pages.length * 100 : undefined });
  const items = photos.data?.pages.flat() ?? [];
  const [selected, setSelected] = useState<string[]>([]);
  return <section className="mt-8" aria-label="Progress photo gallery">
    <h2 className="font-display text-xl font-bold tracking-wide uppercase">Progress photos</h2>
    <p className="text-sm text-muted-foreground">Select two photos to compare. Only you can see them.</p>
    {selected.length === 2 ? <div className="mt-4 grid grid-cols-2 gap-3">
      {selected.map((id) => <ProgressPhotoImage key={id} id={id} size="full" className="max-h-[34rem] w-full rounded-xl object-contain" />)}
    </div> : null}
    {items.length ? <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
      {items.map((photo) => <button key={photo.id} type="button" aria-pressed={selected.includes(photo.id)}
        className={`overflow-hidden rounded-xl border-2 ${selected.includes(photo.id) ? "border-primary" : "border-transparent"}`}
        onClick={() => setSelected((current) => current.includes(photo.id) ? current.filter((id) => id !== photo.id) : [...current.slice(-1), photo.id])}>
        <ProgressPhotoImage id={photo.id} className="aspect-square w-full object-cover" />
      </button>)}
    </div> : <p className="mt-4 text-sm text-muted-foreground">{photos.isPending ? "Loading photos…" : photos.isError ? "Could not load photos." : "Add a photo after a workout to start your gallery."}</p>}
    {photos.hasNextPage ? <Button className="mt-4" variant="secondary" disabled={photos.isFetchingNextPage} onClick={() => void photos.fetchNextPage()}>Load more photos</Button> : null}
  </section>;
}
