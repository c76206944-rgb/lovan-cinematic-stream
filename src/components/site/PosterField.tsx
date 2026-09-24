import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { importPosterFromUrl } from "@/lib/subtitles.functions";

/** Shows the current poster and lets staff replace it with a new picture. */
export function PosterField({
  posterPath,
  onChange,
  titleName = "",
}: {
  posterPath: string | null;
  onChange: (path: string) => void;
  titleName?: string;
}) {
  const importUrl = useServerFn(importPosterFromUrl);
  const [webUrl, setWebUrl] = useState("");
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
            {busy ? "Working on the picture" : "Choose a new picture, then save the changes."}
          </p>

          {titleName.trim() ? (
            <div className="mt-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Find a poster online</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {[
                  { label: "Image search", href: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${titleName} film poster`)}` },
                  { label: "Bing images", href: `https://www.bing.com/images/search?q=${encodeURIComponent(`${titleName} movie poster`)}` },
                  { label: "TMDB", href: `https://www.themoviedb.org/search?query=${encodeURIComponent(titleName)}` },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-border px-2.5 py-1 text-xs text-foreground"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Open a link, copy the picture address, paste it below and tap Bring in.
              </p>
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={webUrl}
              onChange={(e) => setWebUrl(e.target.value)}
              onPaste={(e) => {
                const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
                if (file) {
                  e.preventDefault();
                  void pick(file);
                }
              }}
              inputMode="url"
              autoComplete="off"
              placeholder="Paste a picture link or picture"
              className="min-w-0 flex-1 select-text rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null);
                void (async () => {
                  try {
                    if (navigator.clipboard?.read) {
                      const items = await navigator.clipboard.read();
                      for (const item of items) {
                        const type = item.types.find((t) => t.startsWith("image/"));
                        if (type) {
                          const blob = await item.getType(type);
                          await pick(new File([blob], `pasted.${type.split("/")[1] ?? "png"}`, { type }));
                          return;
                        }
                      }
                    }
                    const text = await navigator.clipboard.readText();
                    if (text.trim()) setWebUrl(text.trim());
                    else setError("Nothing to paste. Copy a picture or its link first.");
                  } catch {
                    setError("Your browser blocked pasting. Long press the box and choose Paste.");
                  }
                })();
              }}
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
            >
              Paste
            </button>
            <button
              type="button"
              disabled={busy || !webUrl.trim()}
              onClick={() => {
                setError(null);
                setBusy(true);
                void importUrl({ data: { url: webUrl.trim() } })
                  .then(({ path }) => {
                    setPreview(webUrl.trim());
                    onChange(path);
                    setWebUrl("");
                  })
                  .catch((cause: unknown) =>
                    setError(cause instanceof Error ? cause.message : "That picture could not be brought in."),
                  )
                  .finally(() => setBusy(false));
              }}
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
            >
              Bring in
            </button>
          </div>
          {error ? <p className="mt-2 text-xs text-primary">{error}</p> : null}
        </div>

      </div>
    </div>
  );
}
