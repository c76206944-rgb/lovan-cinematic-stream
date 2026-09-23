import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output } from "ai";
import { z } from "zod";
import { getCatalog } from "@/lib/public-catalog.functions";

const Input = z.object({ query: z.string().min(3).max(600) });

const Result = z.object({
  intro: z.string(),
  picks: z.array(
    z.object({
      id: z.string(),
      reason: z.string(),
    }),
  ),
});

export const recommendTitles = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const titles = await getCatalog();
    const catalogue = titles.map((t) => ({
      id: t.id,
      name: t.kind === "series" && t.episodeTitle ? `${t.name}: ${t.episodeTitle}` : t.name,
      cast: t.cast,
      director: t.director,
      year: t.year,
      kind: t.kind,
      country: t.country,
      language: t.language,
      genres: t.genres,
      runtime: t.runtime,
      maturity: t.maturity,
      synopsis: t.synopsis,
    }));

    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      output: Output.object({ schema: Result }),
      system:
        "You recommend titles from the LOVAN catalogue only. Choose between one and five titles from the provided list that best match the viewer request. Use only ids from the list. Keep each reason to one short plain sentence. Write plain literal copy with no dashes and no emojis.",
      prompt: `Viewer request: ${data.query}\n\nCatalogue as JSON:\n${JSON.stringify(catalogue)}`,
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
    const valid = new Set(titles.map((t) => t.id));
    return {
      intro: output.intro,
      picks: output.picks.filter((p) => valid.has(p.id)).slice(0, 5),
    };
  });
