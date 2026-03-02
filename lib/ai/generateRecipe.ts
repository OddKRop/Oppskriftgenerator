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

  const schemaExample = JSON.stringify(
    {
      id: "pasta-carbonara",
      title: "Pasta Carbonara",
      servings: 2,
      timeMinutes: 25,
      ingredients: [{ item: "pasta", quantity: "200g" }, { item: "eggs" }],
      steps: ["Boil pasta.", "Mix eggs and cheese.", "Combine and serve."],
      missingIngredients: [{ item: "guanciale", reason: "for sauce" }],
      notes: ["Best served immediately"],
    },
    null,
    2
  );

  return [
    "Generate exactly one recipe as strict JSON. No markdown. No prose. No code fences.",
    "Rules:",
    "- Prioritize using the user's ingredients.",
    "- List at most 5 missing ingredients.",
    "- Only include truly missing ingredients in missingIngredients (items the user did NOT list).",
    "- For each missingIngredients entry, use a short reason phrase like 'for sauce', 'for garnish', or 'for serving' when applicable.",
    `- Keep under 40 minutes unless allowLongerTime is ${input.allowLongerTime ? "true (longer is fine)" : "false"}.`,
    "- For optional fields (servings, timeMinutes, quantity, reason, notes): omit the key entirely if not applicable. Do NOT use null.",
    "- missingIngredients must always be present as an array (use [] if none are missing).",
    "- The id must be a short kebab-case slug, e.g. 'chicken-stir-fry'.",
    "",
    "Example output:",
    schemaExample,
    "",
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

function parseAndValidateRecipe(raw: string, requestId: string, attempt: number): GeneratedRecipe | null {
  try {
    const parsed = JSON.parse(raw);
    const result = GeneratedRecipeSchema.safeParse(parsed);
    if (!result.success) {
      console.warn("[ai.validate.schema_error]", {
        requestId,
        attempt,
        issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
      return null;
    }
    return result.data;
  } catch (err) {
    console.warn("[ai.validate.parse_error]", {
      requestId,
      attempt,
      message: err instanceof Error ? err.message : "Unknown parse error",
      rawSnippet: raw.slice(0, 300),
    });
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
      const recipe = parseAndValidateRecipe(raw, requestId, attempt);

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
