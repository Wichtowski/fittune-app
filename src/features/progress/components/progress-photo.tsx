import { useEffect, useState } from "react";

import { account } from "@/api/account";
import { fittune } from "@/api/fittune";

/**
 * Object URLs stay in memory and are revoked when the photo is no longer shown. `ownerId` loads a
 * friend's shared photo instead of one of the user's own
 */
export function ProgressPhotoImage({
  id,
  ownerId,
  size = "thumb",
  alt = "Private progress photo",
  className = "",
}: {
  id: string;
  ownerId?: string;
  size?: "full" | "thumb";
  alt?: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    const blob = ownerId ? account.friendPhotoBlob(ownerId, id, size) : fittune.photoBlob(id, size);
    void blob.then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (active) setError(true); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, ownerId, size]);
  return url ? <img src={url} alt={alt} className={className} /> :
    <div className={`flex items-center justify-center bg-muted text-xs text-muted-foreground ${className}`}>{error ? "Photo unavailable" : "Loading photo…"}</div>;
}
