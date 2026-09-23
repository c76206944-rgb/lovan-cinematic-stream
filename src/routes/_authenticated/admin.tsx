import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { describeTitle, type Suggestion, type FieldKey } from "@/lib/metadata.functions";
import { saveTitle } from "@/lib/catalog.functions";
import { AdminTabs } from "@/components/site/AdminTabs";
import { Button } from "@/components/ui/button";
import * as tus from "tus-js-client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Upload studio | LOVAN" },
      { name: "description", content: "LOVAN admin upload studio." },
      { property: "og:title", content: "Upload studio | LOVAN" },
      { property: "og:description", content: "LOVAN admin upload studio." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Kind = "movie" | "series";

type CatalogRow = {
  id: string;
  name: string;
  kind: string;
  season: number | null;
  episode: number | null;
  published: boolean;
  genres: string[];
  created_at: string;
};

type StageState = { state: "idle" | "active" | "complete" | "failed"; progress: number; detail: string };
type SaveStage = "video" | "poster" | "validation" | "catalogue";
type ExistingRecord = { id: string; name: string; kind: Kind; seriesName: string; season: number | null; episode: number | null; year: number; published: boolean; archived: boolean };

const initialStages: Record<SaveStage, StageState> = {
  video: { state: "idle", progress: 0, detail: "Waiting" },
  poster: { state: "idle", progress: 0, detail: "Waiting" },
  validation: { state: "idle", progress: 0, detail: "Waiting" },
  catalogue: { state: "idle", progress: 0, detail: "Waiting" },
};

const placements = [
  { id: "pre_roll", label: "Pre roll" },
  { id: "mid_roll", label: "Mid roll" },
  { id: "post_roll", label: "Post roll" },
  { id: "banner", label: "Banner" },
  { id: "sponsored_card", label: "Sponsored card" },
];

const inputClass =
  "mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary";
const labelClass = "text-xs uppercase tracking-wide text-muted-foreground";

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{props.label}</span>
      {props.children}
    </label>
  );
}

function AdminPage() {
  const enrich = useServerFn(describeTitle);
  const persist = useServerFn(saveTitle);

  const [checking, setChecking] = useState(true);
  const [staff, setStaff] = useState(false);
  const [email, setEmail] = useState("");
  const [aiLanguage, setAiLanguage] = useState("English");

  const [kind, setKind] = useState<Kind>("movie");
  const [name, setName] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [season, setSeason] = useState("");
  const [episode, setEpisode] = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [notes, setNotes] = useState("");

  const [synopsis, setSynopsis] = useState("");
  const [genres, setGenres] = useState("");
  const [castMembers, setCast] = useState("");
  const [director, setDirector] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [runtime, setRuntime] = useState("");
  const [maturity, setMaturity] = useState("");
  const [year, setYear] = useState("");
  const [premium, setPremium] = useState(false);
  const [published, setPublished] = useState(false);
  const [offlineAllowed, setOfflineAllowed] = useState(false);
  const [review, setReview] = useState<{ recognized: boolean; matchedTitle: string; confidence: string; items: Suggestion[] } | null>(null);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const uploadKey = useRef<string>(crypto.randomUUID());
  const uploaded = useRef<{ sig: string; video: string | null; poster: string | null } | null>(null);

  const [adEnabled, setAdEnabled] = useState(false);
  const [adPlacements, setAdPlacements] = useState<string[]>([]);
  const [adCues, setAdCues] = useState("");
  const [adNotes, setAdNotes] = useState("");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<Record<SaveStage, StageState>>(initialStages);
  const [failedStage, setFailedStage] = useState<SaveStage | null>(null);
  const [existingRecord, setExistingRecord] = useState<ExistingRecord | null>(null);
  const [rows, setRows] = useState<CatalogRow[]>([]);

  const loadRows = useCallback(async () => {
    const { data } = await supabase
      .from("catalog_titles")
      .select("id, name, kind, season, episode, published, genres, created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    setRows((data ?? []) as CatalogRow[]);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!active) return;
      setEmail(userData.user?.email ?? "");
      if (userData.user?.id) {
        const { data: profile } = await supabase.from("profiles").select("ai_language").eq("user_id", userData.user.id).maybeSingle();
        if (profile?.ai_language) setAiLanguage(profile.ai_language);
      }
      await supabase.rpc("claim_owner_admin");
      const { data: isStaff } = await supabase.rpc("is_staff", {
        _user_id: userData.user?.id ?? "",
      });
      if (!active) return;
      setStaff(Boolean(isStaff));
      setChecking(false);
      if (isStaff) void loadRows();
    })();
    return () => {
      active = false;
    };
  }, [loadRows]);

  useEffect(() => {
    if (!posterFile) {
      setPosterPreview(null);
      return;
    }
    const url = URL.createObjectURL(posterFile);
    setPosterPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [posterFile]);

  const displayName = useMemo(() => {
    if (kind === "series" && episodeTitle) return episodeTitle;
    return name;
  }, [kind, name, episodeTitle]);

  const togglePlacement = (id: string) => {
    setAdPlacements((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const runEnrich = async () => {
    setError(null);
    setStatus(null);
    if (!name.trim()) {
      setError("Enter the title name first.");
      return;
    }
    setEnriching(true);
    try {
      const result = await enrich({
        data: { name: name.trim(), kind, notes: notes.trim(), outputLanguage: aiLanguage },
      });
      setReview({ recognized: result.recognized, matchedTitle: result.matchedTitle, confidence: result.confidence, items: result.suggestions });
      setAccepted(Object.fromEntries(result.suggestions.map((x) => [x.key, x.verified && Boolean(x.value)])));
      setStatus("Review the suggestions below. Nothing is used until you apply it.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not fill in the details.");
    } finally {
      setEnriching(false);
    }
  };

  const setters: Record<FieldKey, (v: string) => void> = {
    synopsis: setSynopsis, genres: setGenres, cast: setCast, director: setDirector, country: setCountry,
    language: setLanguage, runtime: setRuntime, maturity: setMaturity, year: setYear,
  };
  const applyReview = () => {
    if (!review) return;
    for (const item of review.items) if (accepted[item.key] && item.value) setters[item.key](item.value);
    setReview(null);
    setStatus("Applied the selected suggestions. You can still edit every field.");
  };

  const updateStage = (stage: SaveStage, patch: Partial<StageState>) => {
    setStages((current) => ({ ...current, [stage]: { ...current[stage], ...patch } }));
  };

  const uploadFile = async (file: File, folder: string, stage: "video" | "poster") => {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${folder}/${Date.now()}-${safe}`;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Your session has ended. Sign in again.");
    const base = import.meta.env["VITE_SUPABASE_URL"] as string;
    const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;
    updateStage(stage, { state: "active", progress: 0, detail: "Uploading" });
    await new Promise<void>(async (resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: `${base}/storage/v1/upload/resumable`,
        headers: { authorization: `Bearer ${token}`, apikey: key, "x-upsert": "false" },
        metadata: { bucketName: "media", objectName: path, contentType: file.type || "application/octet-stream", cacheControl: "3600" },
        retryDelays: [0, 1000, 3000, 5000, 10000],
        chunkSize: 6 * 1024 * 1024,
        removeFingerprintOnSuccess: true,
        onProgress: (sent, total) => {
          const next = Math.round((sent / Math.max(total, 1)) * 100);
          updateStage(stage, { state: "active", progress: next, detail: `Uploading ${next}%` });
        },
        onSuccess: () => {
          updateStage(stage, { state: "complete", progress: 100, detail: "Uploaded" });
          resolve();
        },
        onError: (cause) => {
          updateStage(stage, { state: "failed", detail: "Upload interrupted. Retry to resume." });
          reject(Object.assign(cause, { uploadStage: stage }));
        },
      });
      const previous = await upload.findPreviousUploads();
      const resumable = previous[0];
      if (resumable) upload.resumeFromPreviousUpload(resumable);
      upload.start();
    });
    return path;
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setExistingRecord(null);
    setFailedStage(null);
    if (!name.trim()) {
      setError("Enter the title name.");
      return;
    }
    setSaving(true);
    try {
      let videoPath: string | null = null;
      let posterPath: string | null = null;
      if (videoFile || posterFile) {
        setUploading(true);
        const sig = `${videoFile?.name}:${videoFile?.size}|${posterFile?.name}:${posterFile?.size}`;
        if (uploaded.current?.sig === sig) {
          ({ video: videoPath, poster: posterPath } = uploaded.current);
        } else {
          const videoPromise = videoFile
            ? uploadFile(videoFile, "videos", "video").then((path) => { videoPath = path; uploaded.current = { sig, video: path, poster: uploaded.current?.sig === sig ? uploaded.current.poster : null }; })
            : Promise.resolve();
          const posterPromise = posterFile
            ? uploadFile(posterFile, "posters", "poster").then((path) => { posterPath = path; uploaded.current = { sig, video: uploaded.current?.sig === sig ? uploaded.current.video : null, poster: path }; })
            : Promise.resolve();
          const results = await Promise.allSettled([videoPromise, posterPromise]);
          const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
          if (rejected) throw rejected.reason;
          videoPath = uploaded.current?.video ?? videoPath;
          posterPath = uploaded.current?.poster ?? posterPath;
        }
        setUploading(false);
      }

      updateStage("validation", { state: "active", progress: 50, detail: "Checking files and details" });
      updateStage("catalogue", { state: "active", progress: 10, detail: "Saving record" });
      const saved = await persist({
        data: {
          name: displayName.trim() || name.trim(),
          kind,
          series_name: kind === "series" ? seriesName.trim() || name.trim() : "",
          season: kind === "series" && season ? Number(season) : null,
          episode: kind === "series" && episode ? Number(episode) : null,
          episode_title: kind === "series" ? episodeTitle.trim() : "",
          synopsis: synopsis.trim(),
          genres: genres.split(",").map((item) => item.trim()).filter(Boolean),
          cast_members: castMembers.split(",").map((item) => item.trim()).filter(Boolean),
          director: director.trim(),
          country: country.trim(),
          language: language.trim(),
          runtime: runtime.trim(),
          maturity: maturity.trim(),
          year: year ? Number(year) : new Date().getFullYear(),
          premium,
          published,
          ad_enabled: adEnabled,
          ad_placements: adPlacements as ("pre_roll" | "mid_roll" | "post_roll" | "banner" | "sponsored_card")[],
          ad_cues: adCues.trim(),
          ad_notes: adNotes.trim(),
          video_path: videoPath,
          poster_url: posterPath,
          offline_allowed: offlineAllowed,
          upload_key: uploadKey.current,
        },
      });

      updateStage("validation", { state: "complete", progress: 100, detail: "Checks passed" });
      updateStage("catalogue", { state: "complete", progress: 100, detail: saved.duplicate ? "Existing record found" : "Saved" });
      setExistingRecord(saved.existing as ExistingRecord | null);
      setStatus(saved.duplicate ? "A matching title already exists. No copy was made." : published ? "Saved and published." : "Saved as a draft.");
      uploadKey.current = crypto.randomUUID();
      uploaded.current = null;
      setVideoFile(null);
      setPosterFile(null);
      void loadRows();
    } catch (cause) {
      const tagged = cause as Error & { uploadStage?: SaveStage };
      const currentFailed = tagged.uploadStage ?? (uploading ? "video" : "catalogue");
      setFailedStage(currentFailed);
      updateStage(currentFailed, { state: "failed", detail: "Failed. Retry will continue from completed work." });
      setError(cause instanceof Error ? cause.message : "Could not save the title.");
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-6">
        <p className="text-sm text-muted-foreground">Checking your access.</p>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Access restricted</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The account {email} is not allowed in the studio.
        </p>
        <Link to="/home" className="mt-6 inline-block text-sm text-primary">
          Back to LOVAN
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Upload studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {email}. Add a film or an episode to the catalogue.
          </p>
        </div>
        <div className="flex gap-2 rounded-md border border-border p-1">
          {(["movie", "series"] as Kind[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setKind(option)}
              className={`rounded px-4 py-1.5 text-sm transition-colors ${
                kind === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option === "movie" ? "Film" : "Series"}
            </button>
          ))}
        </div>
      </header>
      <div className="mt-4">
        <AdminTabs />
      </div>

      <form id="upload-form" onSubmit={save} className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <section className="rounded-lg border border-border p-5">
            <h2 className="text-sm font-medium text-foreground">Title</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={kind === "series" ? "Series name" : "Film name"}>
                <input
                  className={inputClass}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (kind === "series") setSeriesName(event.target.value);
                  }}
                  required
                />
              </Field>
              <Field label="Release year">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                />
              </Field>
              {kind === "series" ? (
                <>
                  <Field label="Season">
                    <input
                      className={inputClass}
                      inputMode="numeric"
                      value={season}
                      onChange={(event) => setSeason(event.target.value)}
                    />
                  </Field>
                  <Field label="Episode number">
                    <input
                      className={inputClass}
                      inputMode="numeric"
                      value={episode}
                      onChange={(event) => setEpisode(event.target.value)}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Episode title">
                      <input
                        className={inputClass}
                        value={episodeTitle}
                        onChange={(event) => setEpisodeTitle(event.target.value)}
                      />
                    </Field>
                  </div>
                </>
              ) : null}
              <div className="sm:col-span-2">
                <Field label="Notes for the assistant">
                  <textarea
                    className={`${inputClass} min-h-24`}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="A few lines about the story, the cast and where it was filmed."
                  />
                </Field>
              </div>
            </div>
            <button
              type="button"
              onClick={runEnrich}
              disabled={enriching}
              className="mt-4 rounded-md border border-primary px-4 py-2 text-sm text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {enriching ? "Working" : "Fill in details with AI"}
            </button>
          </section>

          {review ? (
            <section className="rounded-lg border border-primary/40 p-5">
              <h2 className="text-sm font-medium text-foreground">Review AI suggestions</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {review.recognized ? `Matched: ${review.matchedTitle || "known title"}.` : "Not recognized as a known title."} Overall confidence {review.confidence}. Verified items are ticked. Cast, director and year that could not be confirmed were removed.
              </p>
              <ul className="mt-4 divide-y divide-border rounded-md border border-border">
                {review.items.map((item) => (
                  <li key={item.key} className="flex gap-3 p-3 text-sm">
                    <input
                      type="checkbox"
                      disabled={!item.value}
                      checked={Boolean(accepted[item.key])}
                      onChange={(e) => setAccepted((c) => ({ ...c, [item.key]: e.target.checked }))}
                      className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {item.key} · {item.source === "known_title" ? "known title" : item.source} · {item.confidence}
                        {item.verified ? " · verified" : ""}
                      </p>
                      <p className="mt-1 break-words text-foreground">{item.value || "No suggestion"}</p>
                      {item.warning ? <p className="mt-1 text-xs text-primary">{item.warning}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={applyReview} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
                  Apply selected
                </button>
                <button type="button" onClick={() => setReview(null)} className="rounded-md border border-border px-4 py-2 text-sm text-foreground">
                  Discard
                </button>
              </div>
            </section>
          ) : null}

          <section className="rounded-lg border border-border p-5">
            <h2 className="text-sm font-medium text-foreground">Details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Synopsis">
                  <textarea
                    className={`${inputClass} min-h-28`}
                    value={synopsis}
                    onChange={(event) => setSynopsis(event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Genres, separated by commas">
                <input
                  className={inputClass}
                  value={genres}
                  onChange={(event) => setGenres(event.target.value)}
                />
              </Field>
              <Field label="Cast, separated by commas">
                <input
                  className={inputClass}
                  value={castMembers}
                  onChange={(event) => setCast(event.target.value)}
                />
              </Field>
              <Field label="Director">
                <input
                  className={inputClass}
                  value={director}
                  onChange={(event) => setDirector(event.target.value)}
                />
              </Field>
              <Field label="Country">
                <input
                  className={inputClass}
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                />
              </Field>
              <Field label="Language">
                <input
                  className={inputClass}
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                />
              </Field>
              <Field label="Runtime">
                <input
                  className={inputClass}
                  value={runtime}
                  onChange={(event) => setRuntime(event.target.value)}
                />
              </Field>
              <Field label="Maturity">
                <input
                  className={inputClass}
                  value={maturity}
                  onChange={(event) => setMaturity(event.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-border p-5">
            <h2 className="text-sm font-medium text-foreground">Advertising</h2>
            <label className="mt-4 flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={adEnabled}
                onChange={(event) => setAdEnabled(event.target.checked)}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              Show adverts on this title for free viewers
            </label>
            {adEnabled ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {placements.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => togglePlacement(item.id)}
                      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                        adPlacements.includes(item.id)
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <Field label="Mid roll cue points, for example 00:14:30, 00:38:00">
                  <input
                    className={inputClass}
                    value={adCues}
                    onChange={(event) => setAdCues(event.target.value)}
                  />
                </Field>
                <Field label="Advert notes">
                  <textarea
                    className={`${inputClass} min-h-20`}
                    value={adNotes}
                    onChange={(event) => setAdNotes(event.target.value)}
                  />
                </Field>
              </div>
            ) : null}
          </section>
        </div>

        <div className="space-y-8">
          <section className="rounded-lg border border-border p-5">
            <h2 className="text-sm font-medium text-foreground">Files</h2>
            <div className="mt-4 space-y-5">
              <Field label="Video file, MP4">
                <input
                  type="file"
                  accept="video/mp4,video/*,.m3u8"
                  onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
                  className="mt-2 w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-foreground"
                />
              </Field>
              {videoFile ? (
                <p className="text-xs text-muted-foreground">
                  {videoFile.name}, {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              ) : null}
              <Field label="Poster artwork">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setPosterFile(event.target.files?.[0] ?? null)}
                  className="mt-2 w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-foreground"
                />
              </Field>
              {posterPreview ? (
                <img
                  src={posterPreview}
                  alt="Poster preview"
                  className="w-full rounded-md border border-border object-cover"
                />
              ) : null}
              {saving && !uploading ? (
                <p className="text-xs text-muted-foreground">Checking files and saving.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-lg border border-border p-5" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-foreground">Upload and save status</h2>
              {failedStage ? <Button type="submit" form="upload-form" size="sm">Retry</Button> : null}
            </div>
            <div className="mt-4 space-y-3">
              {(["video", "poster", "validation", "catalogue"] as SaveStage[]).map((stage) => {
                const item = stages[stage];
                return (
                  <div key={stage}>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="capitalize text-foreground">{stage}</span>
                      <span className={item.state === "failed" ? "text-primary" : "text-muted-foreground"}>{item.detail}</span>
                    </div>
                    {item.state === "active" ? <div className="mt-1 h-1 overflow-hidden rounded-sm bg-surface"><div className="h-full bg-primary transition-[width]" style={{ width: `${item.progress}%` }} /></div> : null}
                  </div>
                );
              })}
            </div>
            {existingRecord ? (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground">Existing record</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {existingRecord.kind === "series" ? `${existingRecord.seriesName || existingRecord.name}, season ${existingRecord.season}, episode ${existingRecord.episode}` : `${existingRecord.name} (${existingRecord.year})`} · {existingRecord.archived ? "Archived" : existingRecord.published ? "Published" : "Draft"}
                </p>
                <Link to="/admin/catalog" search={{}} className="mt-3 inline-block text-sm text-primary">Open in Catalogue</Link>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-border p-5">
            <h2 className="text-sm font-medium text-foreground">Publishing</h2>
            <label className="mt-4 flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={premium}
                onChange={(event) => setPremium(event.target.checked)}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              Premium only
            </label>
            <label className="mt-3 flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={published}
                onChange={(event) => setPublished(event.target.checked)}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              Publish to the catalogue now
            </label>
            <label className="mt-3 flex items-center gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={offlineAllowed}
                onChange={(event) => setOfflineAllowed(event.target.checked)}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              Approve for offline viewing in the app
            </label>
            {error ? <p className="mt-4 text-sm text-primary">{error}</p> : null}
            {status ? <p className="mt-4 text-sm text-muted-foreground">{status}</p> : null}
            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving" : "Save title"}
            </button>
          </section>
        </div>
      </form>

      <section className="mt-12">
        <h2 className="text-sm font-medium text-foreground">Recent uploads</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Genres</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-muted-foreground">
                    Nothing uploaded yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground">{row.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.kind === "series"
                        ? `Series S${row.season ?? "?"} E${row.episode ?? "?"}`
                        : "Film"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.genres.join(", ") || "Not set"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={row.published ? "text-primary" : "text-muted-foreground"}>
                        {row.published ? "Published" : "Draft"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
