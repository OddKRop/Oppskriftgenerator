import "server-only";
import { getOpenAIApiKey } from "@/lib/ai/openaiConfig";
import {
  GeneratedRecipeSchema,
  type GenerateRecipeInput,
  type GeneratedRecipe,
} from "@/lib/schema/generatedRecipe";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

type GenerateRecipeResult =
  | { ok: true; recipe: GeneratedRecipe; attempts: number }
  | {
      ok: false;
      code: "missing_api_key" | "provider_error" | "invalid_model_output";
      message: string;
      attempts: number;
    };

function buildPrompt(input: GenerateRecipeInput): string {
  const ingredientsText = input.ingredients.map((item) => `- ${item}`).join("\n");
  const preferencesText = input.preferences?.trim() ? input.preferences.trim() : "None";

  return [
    "Generate exactly one recipe as strict JSON.",
    "Rules:",
    "- Prioritize using the user's ingredients.",
    "- Max 5 missing ingredients.",
    "- Weeknight friendly, under 40 minutes unless allowLongerTime is true.",
    "- Output must be valid JSON only. No markdown. No prose.",
    "- JSON keys must match this exact schema:",
    '{ "id": "string", "title": "string", "servings": "number optional", "timeMinutes": "number optional", "ingredients": [{"item":"string","quantity":"string optional"}], "steps": ["string"], "missingIngredients": [{"item":"string","reason":"string optional"}], "notes": ["string optional"] }',
    `allowLongerTime: ${input.allowLongerTime ? "true" : "false"}`,
    `User ingredients:\n${ingredientsText}`,
    `User preferences: ${preferencesText}`,
  ].join("\n");
}

async function requestModel(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a cooking assistant. Return valid JSON only, matching the requested keys and constraints.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${text.slice(0, 250)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent || typeof rawContent !== "string") {
    throw new Error("OpenAI response missing message content.");
  }

  return rawContent;
}

function parseAndValidateRecipe(raw: string): GeneratedRecipe | null {
  try {
    const parsed = JSON.parse(raw);
    const result = GeneratedRecipeSchema.safeParse(parsed);
    if (!result.success) {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

export async function generateRecipeFromAI(
  input: GenerateRecipeInput,
  requestId: string
): Promise<GenerateRecipeResult> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return {
      ok: false,
      code: "missing_api_key",
      message: "AI configuration is missing on the server.",
      attempts: 0,
    };
  }

  const basePrompt = buildPrompt(input);
  const retryPrompt = `${basePrompt}\nYour previous answer was invalid. Return valid JSON only.`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await requestModel(attempt === 1 ? basePrompt : retryPrompt, apiKey);
      const recipe = parseAndValidateRecipe(raw);

      if (recipe) {
        return { ok: true, recipe, attempts: attempt };
      }

      console.warn("[ai.generate.validation_failed]", {
        requestId,
        attempt,
        reason: "json_parse_or_schema_validation_failed",
      });
    } catch (error) {
      console.error("[ai.generate.provider_error]", {
        requestId,
        attempt,
        message: error instanceof Error ? error.message : "Unknown provider error",
      });

      if (attempt === 2) {
        return {
          ok: false,
          code: "provider_error",
          message: "AI provider request failed.",
          attempts: attempt,
        };
      }
    }
  }

  return {
    ok: false,
    code: "invalid_model_output",
    message: "Model returned invalid JSON output.",
    attempts: 2,
  };
}
