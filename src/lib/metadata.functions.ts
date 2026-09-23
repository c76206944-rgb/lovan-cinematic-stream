import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";

const Input = z.object({
  name: z.string().min(1).max(200),
  kind: z.string().min(1).max(40),
  notes: z.string().max(4000),
});

const Level = z.enum(["high", "medium", "low"]);
const Source = z.enum(["notes", "known_title", "inferred", "none"]);
const Field = z.object({ value: z.string(), source: Source, confidence: Level });

const Schema = z.object({
  recognized: z.boolean(),
  matched_title: z.string(),
  overall_confidence: Level,
  synopsis: Field,
  genres: Field,
  cast: Field,
  director: Field,
  country: Field,
  language: Field,
  runtime: Field,
  maturity: Field,
  year: Field,
});

export const FIELD_KEYS = ["synopsis", "genres", "cast", "director", "country", "language", "runtime", "maturity", "year"] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];
export type Suggestion = {
  key: FieldKey;
  value: string;
  source: z.infer<typeof Source>;
  confidence: z.infer<typeof Level>;
  verified: boolean;
  warning: string | null;
};

const GENRES = [
  "Drama", "Comedy", "Thriller", "Crime", "Action", "Adventure", "Romance", "Horror",
  "Science Fiction", "Fantasy", "Mystery", "Documentary", "Animation", "Family",
  "Musical", "War", "Western", "History", "Biography", "Sport", "Short Film",
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Checks each suggestion against where the model says it came from. */
function validate(out: z.infer<typeof Schema>, notes: string): Suggestion[] {
  const n = norm(notes);
  const trusted = out.recognized && out.overall_confidence !== "low";
  return FIELD_KEYS.map((key) => {
    const f = out[key];
    let value = f.value.trim();
    let warning: string | null = null;
    let verified = false;

    if (key === "genres") {
      const picked = value.split(",").map((g) => g.trim()).filter((g) => GENRES.includes(g)).slice(0, 3);
      if (picked.length < value.split(",").filter(Boolean).length) warning = "Unknown genres were removed.";
      value = picked.join(", ");
    }
    if (key === "cast") value = value.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 6).join(", ");
    if (key === "year" && value && !/^\d{4}$/.test(value)) {
      value = "";
      warning = "The year was not a valid four digit year.";
    }

    if (!value) return { key, value: "", source: "none", confidence: "low", verified: false, warning };

    if (f.source === "notes") {
      const parts = key === "cast" ? value.split(",").map((c) => c.trim()) : [value];
      const found = key === "synopsis" || parts.every((p) => n.includes(norm(p)));
      verified = found;
      if (!found) warning = "Not found in your notes. Check before using.";
    } else if (f.source === "known_title") {
      verified = trusted && f.confidence === "high";
      if (!trusted) warning = "The title was not confidently recognized.";
      else if (f.confidence !== "high") warning = "The AI is not certain about this.";
    } else {
      warning = key === "synopsis" || key === "genres" ? null : "Guessed, not a known fact.";
      verified = key === "synopsis" || key === "genres" ? f.confidence !== "low" : false;
    }

    // People and dates are never suggested without a verified source.
    if (!verified && (key === "cast" || key === "director" || key === "year") && f.source !== "notes") {
      return { key, value: "", source: "none", confidence: "low", verified: false, warning: "Removed: could not be confirmed." };
    }
    return { key, value, source: f.source, confidence: f.confidence, verified, warning };
  });
}

export const describeTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!staff) throw new Error("Forbidden");

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      output: Output.object({ schema: Schema }),
      system: [
        "You are a careful film archivist preparing catalogue metadata for a streaming service.",
        "Accuracy matters more than completeness. Never invent people, dates or facts.",
        "Decide whether you genuinely recognize this exact title. Set recognized true only if sure, and put the exact work you matched (name and year) in matched_title, else empty.",
        "For every field return value, source and confidence.",
        "source is notes when the value is written in the uploader notes, known_title when it comes from your knowledge of the recognized work, inferred when you reasoned it (like a synopsis or genre from a description), none when empty.",
        "If not recognized, leave cast, director and year empty unless they are in the notes.",
        "Use the uploader notes over your memory when they conflict.",
        `genres: one to three, comma separated, only from: ${GENRES.join(", ")}.`,
        "cast: up to six names, comma separated, billing order.",
        "synopsis: two or three plain sentences, no ending spoilers, no dashes, no emojis, no marketing phrases.",
        "runtime: 1h 48m for films or 8 episodes for series. year: four digits.",
        "confidence high only when certain.",
      ].join(" "),
      prompt: `Title name: ${data.name}\nType: ${data.kind}\nNotes from the uploader:\n${data.notes || "(none)"}`,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    let out: z.infer<typeof Schema>;
    try {
      out = await result.output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) throw new Error("The AI reply could not be read. Try again.");
      throw error;
    }
    return {
      recognized: out.recognized,
      matchedTitle: out.matched_title,
      confidence: out.overall_confidence,
      suggestions: validate(out, `${data.name} ${data.notes}`),
    };
  });
