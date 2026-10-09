import { createFileRoute } from "@tanstack/react-router";
import { slugify, titleSlug } from "@/lib/slug";

const SITE = "https://www.lovan.site";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function webhookSecret(token: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`telegram-webhook:${token}`)));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function reply(token: string, chatId: number, text: string, replyTo?: number) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: false, reply_to_message_id: replyTo }),
  });
  if (!res.ok) console.error(`[telegram webhook] ${res.status}: ${await res.text()}`);
}

async function searchTitles(q: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const safe = q.replace(/[%_,()]/g, " ").trim();
  const { data } = await supabaseAdmin
    .from("catalog_titles")
    .select("id, name, kind, year, series_name, season, episode")
    .eq("published", true)
    .eq("archived", false)
    .or(`name.ilike.%${safe}%,series_name.ilike.%${safe}%`)
    .order("season", { ascending: true, nullsFirst: true })
    .order("episode", { ascending: true, nullsFirst: true })
    .limit(60);
  // One line per film, one line per series (its first episode).
  const seen = new Set<string>();
  const out: { label: string; link: string }[] = [];
  for (const r of data ?? []) {
    const isSeries = r.kind === "series";
    const key = isSeries ? `s:${slugify(r.series_name || r.name)}` : r.id;
    if (seen.has(key)) continue;
    seen.add(key);
    const label = `${isSeries ? r.series_name || r.name : r.name}${r.year ? ` (${r.year})` : ""}${isSeries ? " - series" : ""}`;
    out.push({ label, link: `${SITE}/title/${titleSlug(r.name, r.id)}` });
    if (out.length >= 8) break;
  }
  return out;
}

const HELP =
  "Search LOVAN and get watch links.\n\n/search name - find a film or series, for example /search spider man\n/latest - newest titles\n\nYou can also just type a title name here.";

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["TELEGRAM_BOT_TOKEN"];
        if (!token) return new Response("Not configured", { status: 500 });
        if ((request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "") !== (await webhookSecret(token))) {
          return new Response("Unauthorized", { status: 401 });
        }
        const update = (await request.json().catch(() => null)) as any;
        const msg = update?.message ?? update?.channel_post;
        const text: string = (msg?.text ?? "").trim();
        const chatId: number | undefined = msg?.chat?.id;
        if (!chatId || !text) return Response.json({ ok: true });
        const isPrivate = msg.chat.type === "private";
        const [cmdRaw, ...rest] = text.split(/\s+/);
        const cmd = cmdRaw.toLowerCase().replace(/@lovancinemabot$/, "");
        try {
          if (cmd === "/start" || cmd === "/help") {
            await reply(token, chatId, HELP);
          } else if (cmd === "/latest") {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { data } = await supabaseAdmin
              .from("catalog_titles")
              .select("id, name, year, kind, series_name")
              .eq("published", true).eq("archived", false).eq("kind", "movie")
              .order("created_at", { ascending: false }).limit(8);
            const lines = (data ?? []).map((r) => `<a href="${SITE}/title/${titleSlug(r.name, r.id)}">${esc(r.name)}${r.year ? ` (${r.year})` : ""}</a>`);
            await reply(token, chatId, lines.length ? `Newest on LOVAN:\n\n${lines.join("\n")}` : "Nothing new yet.");
          } else if (cmd === "/search" || (isPrivate && !text.startsWith("/"))) {
            const q = (cmd === "/search" ? rest.join(" ") : text).slice(0, 80);
            if (q.length < 2) {
              await reply(token, chatId, "Type a title after /search, for example /search spider man", msg.message_id);
            } else {
              const found = await searchTitles(q);
              const body = found.length
                ? `Results for "${esc(q)}":\n\n${found.map((f) => `<a href="${f.link}">${esc(f.label)}</a>`).join("\n")}`
                : `No title called "${esc(q)}" yet. Ask for it at ${SITE}/requests`;
              await reply(token, chatId, body, msg.message_id);
            }
          }
        } catch (e) {
          console.error("[telegram webhook]", e);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
