import { useEffect, useState } from "react";

import { photoBlob } from "@/api/photos";

/** Object URLs stay in memory and are revoked when the photo is no longer shown. */
export function ProgressPhotoImage({ id, size = "thumb", className = "" }: { id: string; size?: "full" | "thumb"; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    void photoBlob(id, size).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (active) setError(true); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, size]);
  return url ? <img src={url} alt="Private progress photo" className={className} /> :
    <div className={`flex items-center justify-center bg-muted text-xs text-muted-foreground ${className}`}>{error ? "Photo unavailable" : "Loading photo…"}</div>;
}
