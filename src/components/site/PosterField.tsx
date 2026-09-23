import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Shows the current poster and lets staff replace it with a new picture. */
export function PosterField({
  posterPath,
  onChange,
}: {
  posterPath: string | null;
  onChange: (path: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localUrl = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!posterPath) {
      setPreview(null);
      return;
    }
    void supabase.storage
      .from("media")
      .createSignedUrl(posterPath, 3600)
      .then(({ data }) => {
        if (active && data?.signedUrl) setPreview(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [posterPath]);

  const pick = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `posters/${Date.now()}-${safe}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;
      if (localUrl.current) URL.revokeObjectURL(localUrl.current);
      localUrl.current = URL.createObjectURL(file);
      setPreview(localUrl.current);
      onChange(path);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The picture could not be uploaded.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sm:col-span-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Poster</span>
      <div className="mt-1.5 flex items-start gap-4">
        <div className="h-36 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pick(file);
            }}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-foreground"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {busy ? "Uploading the picture" : "Choose a new picture, then save the changes."}
          </p>
          {error ? <p className="mt-2 text-xs text-primary">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
