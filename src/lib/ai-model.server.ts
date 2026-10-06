import { createOpenAI } from "@ai-sdk/openai";
import type { SharedV4ProviderOptions } from "@ai-sdk/provider";

type Effort = "low" | "medium";

// Uses the owner's Google Gemini key when present, otherwise the built-in AI gateway.
export function pickModel(effort: Effort = "low") {
  // Secrets pasted into dashboards often carry spaces, line breaks or quote marks. Google rejects those as invalid keys.
  const gemini = (process.env["GEMINI_API_KEY"] ?? "").trim().replace(/^["']|["']$/g, "").trim();
  const geminiModel = (process.env["GEMINI_MODEL"] ?? "").trim() || "gemini-flash-latest";

  if (gemini) {
    const google = createOpenAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      apiKey: gemini,
    });
    const providerOptions: SharedV4ProviderOptions = {};
    return { model: google.chat(geminiModel), providerOptions, provider: "gemini" as const };
  }

  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("No AI key is configured. Set GEMINI_API_KEY.");

  const lovable = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const providerOptions: SharedV4ProviderOptions = {
    openai: {
      forceReasoning: true,
      reasoningEffort: effort,
      store: false,
      include: ["reasoning.encrypted_content"],
    },
  };
  return { model: lovable.responses("openai/gpt-6-astra"), providerOptions, provider: "lovable-gateway" as const };
}

/** Turns an AI provider failure into a message that says what actually went wrong. */
export function explainAiError(error: unknown, provider: string): string {
  const e = error as { statusCode?: number; message?: string; responseBody?: string } | undefined;
  const status = e?.statusCode;
  let detail = "";
  if (typeof e?.responseBody === "string") {
    try {
      const parsed = JSON.parse(e.responseBody);
      const first = Array.isArray(parsed) ? parsed[0] : parsed;
      detail = first?.error?.message ?? "";
    } catch {
      detail = e.responseBody.slice(0, 300);
    }
  }
  if (!detail) detail = String(e?.message ?? error).slice(0, 300);

  let hint = "";
  if (provider === "lovable-gateway") hint = " GEMINI_API_KEY is not set on the server, so the Lovable gateway was used. Publish after adding the secret.";
  else if (status === 400 && /api key/i.test(detail)) hint = " Google rejected the key. Replace the secret with the raw key only.";
  else if (status === 401 || status === 403) hint = " The key is not allowed. Check it is active and has no website or referrer restriction.";
  else if (status === 404) hint = " The model name was not found. Add a secret named GEMINI_MODEL, for example gemini-2.5-flash.";
  else if (status === 429) hint = " Quota or rate limit reached. Wait a minute, or the free tier limit is used up.";

  return `AI error [${provider}${status ? ` ${status}` : ""}]: ${detail}${hint}`;
}
