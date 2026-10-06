import { createOpenAI } from "@ai-sdk/openai";

type Effort = "low" | "medium";

// Uses the owner's Google Gemini key when present, otherwise the built-in AI gateway.
export function pickModel(effort: Effort = "low") {
  const gemini = process.env["GEMINI_API_KEY"];
  if (gemini) {
    const google = createOpenAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: gemini,
    });
    return { model: google.chat("gemini-2.5-flash"), providerOptions: undefined };
  }
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("No AI key is configured.");
  const lovable = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  return {
    model: lovable.responses("openai/gpt-6-astra"),
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: effort,
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  };
}
