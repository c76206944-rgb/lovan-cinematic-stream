import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Announcement = { id: string; body: string };

/** Studio message shown to every viewer, in page flow so it never covers anything. */
export function AnnouncementBar() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);

  useEffect(() => {
    void supabase
      .from("site_announcements")
      .select("id, body")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setItems((data ?? []) as Announcement[]));
    try {
      setHidden(JSON.parse(sessionStorage.getItem("lovan-hidden-notes") ?? "[]") as string[]);
    } catch {
      setHidden([]);
    }
  }, []);

  const visible = items.filter((a) => !hidden.includes(a.id));
  if (visible.length === 0) return null;

  const hide = (id: string) => {
    const next = [...hidden, id];
    setHidden(next);
    sessionStorage.setItem("lovan-hidden-notes", JSON.stringify(next));
  };

  return (
    <div className="border-b border-border bg-surface">
      {visible.map((a) => (
        <div key={a.id} className="mx-auto flex max-w-[1600px] items-start gap-3 border-l-2 border-primary px-4 py-2.5 sm:px-6">
          <p className="min-w-0 flex-1 whitespace-pre-line break-words text-sm text-foreground">{a.body}</p>
          <button type="button" onClick={() => hide(a.id)} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
            Close
          </button>
        </div>
      ))}
    </div>
  );
}
