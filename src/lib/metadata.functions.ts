import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output } from "ai";
import { z } from "zod";

const Input = z.object({
  name: z.string().min(1).max(200),
  kind: z.string().min(1).max(40),
  notes: z.string().max(4000),
});

const Schema = z.object({
  recognized: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  synopsis: z.string(),
  genres: z.array(z.string()),
  cast: z.array(z.string()),
  director: z.string(),
  country: z.string(),
  language: z.string(),
  runtime: z.string(),
  maturity: z.string(),
  year: z.number().nullable(),
});

const GENRES = [
  "Drama", "Comedy", "Thriller", "Crime", "Action", "Adventure", "Romance", "Horror",
  "Science Fiction", "Fantasy", "Mystery", "Documentary", "Animation", "Family",
  "Musical", "War", "Western", "History", "Biography", "Sport", "Short Film",
];

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
        "First decide whether you genuinely recognize this exact title (name plus year, country or cast hints in the notes). Set recognized to true only if you are sure it is a real, specific work you know.",
        "If recognized: give the real director, real principal cast (up to six, billing order), real release year, country of production, original language, runtime and the common age rating.",
        "If not recognized, or it may be an independent or unreleased work: set recognized to false, leave cast and director empty unless they appear in the notes, set year to null unless stated, and write the synopsis only from what the notes say.",
        "Use details from the uploader notes over your own memory when they conflict.",
        `Pick one to three genres, only from this list: ${GENRES.join(", ")}.`,
        "Synopsis: two or three plain sentences, no spoilers of the ending, no dashes, no emojis, no marketing phrases.",
        "Runtime format: 1h 48m for films, or 8 episodes for series. Leave empty if unknown.",
        "Confidence: high only when every returned fact is certain.",
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

    const output = await result.output;
    return {
      ...output,
      genres: output.genres.filter((g) => GENRES.includes(g)).slice(0, 3),
      cast: output.cast.slice(0, 6),
    };
  });
