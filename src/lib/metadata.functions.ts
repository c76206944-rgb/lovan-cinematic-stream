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
  synopsis: z.string(),
  genres: z.array(z.string()),
  cast: z.array(z.string()),
  director: z.string(),
  country: z.string(),
  language: z.string(),
  runtime: z.string(),
  maturity: z.string(),
  year: z.number(),
});

export const describeTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .limit(1);
    if (!staff || staff.length === 0) throw new Error("Forbidden");

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
      system:
        "You prepare catalogue metadata for a streaming service. Return a short synopsis of two or three plain sentences, one to three genres, up to six cast names, a director, a country, a language, a runtime such as 1h 48m or 6 episodes, a maturity label such as PG, 12, 15 or 16, and a release year. If a detail is not given, infer a sensible value from the description. Use plain literal wording with no dashes and no emojis.",
      prompt: `Title name: ${data.name}\nType: ${data.kind}\nNotes from the uploader:\n${data.notes}`,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const output = await result.output;
    return {
      ...output,
      genres: output.genres.slice(0, 3),
      cast: output.cast.slice(0, 6),
    };
  });
