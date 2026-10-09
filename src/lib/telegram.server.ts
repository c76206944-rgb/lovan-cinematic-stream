import { titleSlug } from "./slug";

const CHANNEL = "@lovansite";
const SITE = "https://www.lovan.site";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Posts one title to the LOVAN Telegram channel. Throws with Telegram's reason on failure. */
export async function postTitleToTelegram(supabase: any, id: string) {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) throw new Error("Telegram bot is not set up.");
  const { data: row, error } = await supabase
    .from("catalog_titles")
    .select("id, name, kind, year, genres, synopsis, poster_url, series_name, season, episode, published")
    .eq("id", id)
    .single();
  if (error || !row) throw new Error("Title not found.");
  if (!row.published) throw new Error("Publish the title before posting it.");

  const name = row.kind === "series" && row.series_name ? row.series_name : row.name;
  const link = `${SITE}/title/${titleSlug(row.name, row.id)}`;
  const parts = [`<b>${esc(name)}${row.year ? ` (${row.year})` : ""}</b>`];
  if (row.kind === "series" && row.season && row.episode) parts.push(`Season ${row.season}, Episode ${row.episode}`);
  if (row.genres?.length) parts.push(esc(row.genres.slice(0, 3).join(", ")));
  if (row.synopsis) parts.push("", esc(String(row.synopsis).slice(0, 600)));
  parts.push("", `Watch free on LOVAN: ${link}`);
  const caption = parts.join("\n").slice(0, 1024);
  const reply_markup = { inline_keyboard: [[{ text: "Watch on LOVAN", url: link }]] };

  let photo: string | null = null;
  if (row.poster_url) {
    const { data: s } = await supabase.storage.from("media").createSignedUrl(row.poster_url, 3600);
    photo = s?.signedUrl ?? null;
  }
  const method = photo ? "sendPhoto" : "sendMessage";
  const body = photo
    ? { chat_id: CHANNEL, photo, caption, parse_mode: "HTML", reply_markup }
    : { chat_id: CHANNEL, text: caption, parse_mode: "HTML", reply_markup };
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!res.ok || !json.ok) {
    console.error(`[telegram] ${res.status}: ${json.description}`);
    throw new Error(`Telegram said: ${json.description ?? res.status}`);
  }
  return { ok: true };
}
