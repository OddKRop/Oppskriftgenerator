import "server-only";
import { getOpenAIApiKey } from "@/lib/ai/openaiConfig";
import {
  GeneratedRecipeResultSchema,
  type GenerateRecipeInput,
  type GeneratedRecipe,
  type GeneratedRecipeResult,
} from "@/lib/schema/generatedRecipe";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

type GenerateRecipeResult =
  | {
      ok: true;
      result: { recipe: GeneratedRecipe; assumptions?: string[] } | { clarifyingQuestion: string };
      attempts: number;
    }
  | {
      ok: false;
      code: "missing_api_key" | "provider_error" | "invalid_model_output";
      message: string;
      attempts: number;
    };

const CLEAR_ENGLISH_PATTERNS = [
  /\b(do you have|you can|best served|to taste|for sauce|for garnish|for serving)\b/i,
  /\b(boil|mix|combine|preheat|bake|cook|serve|chop|slice|stir)\b/i,
  /\b(chicken|beef|pork|onion|garlic|cheese)\b/i,
  /\b(optional|weeknight|pantry)\b/i,
];

const FORBIDDEN_UNIT_PATTERNS = [
  /\b(cups?|ounces?|oz|tablespoons?|tbsp|teaspoons?|tsp|pounds?|lbs?)\b/i,
  /\b\d+\s?g\b/i,
];

function buildPrompt(input: GenerateRecipeInput): string {
  const ingredientsText = input.ingredients.map((item) => `- ${item}`).join("\n");
  const preferencesText = input.preferences?.trim() ? input.preferences.trim() : "Ingen";

  const recipeExample = JSON.stringify(
    {
      recipe: {
        id: "pasta-carbonara",
        title: "Kremet pasta med bacon",
        servings: 2,
        timeMinutes: 25,
        ingredients: [
          { item: "pasta", quantity: "200 gram" },
          { item: "egg", quantity: "2 stk" },
        ],
        steps: [
          "Kok pasta etter anvisning på pakken.",
          "Visp egg lett sammen i en bolle.",
          "Bland pasta og egg forsiktig, og server med en gang.",
        ],
        missingIngredients: [{ item: "bacon", reason: "til steking" }],
        notes: ["Smaker best nylaget."],
      },
      assumptions: ["Antok at du har salt og pepper hjemme."],
    },
    null,
    2
  );

  const clarifyingExample = JSON.stringify(
    {
      clarifyingQuestion: "Har du egg tilgjengelig?",
    },
    null,
    2
  );

  return [
    "Lag en hverdagsvennlig oppskrift som streng JSON. Ingen markdown. Ingen fritekst utenfor JSON.",
    "Språkkrav:",
    "- All tekst må være på norsk bokmål.",
    "- Ikke bruk engelske ord eller fraser, med mindre det er helt uunngåelig (for eksempel BBQ).",
    "- Bruk norske ingrediensnavn og norsk kjøkkenspråk.",
    "- steps, ingredients, missingIngredients, notes og assumptions skal være på norsk.",
    "Enhetskrav:",
    "- Bruk metriske/norske enheter: dl, ss, ts, gram, kg.",
    "- Ikke bruk cups, ounces, tablespoons eller teaspoons.",
    "Regler:",
    "- Prioriter ingrediensene brukeren allerede har.",
    "- List maks 5 manglende ingredienser.",
    "- Ta bare med faktisk manglende ingredienser i missingIngredients (varer brukeren ikke har oppgitt).",
    "- For hver missingIngredients-post, bruk en kort norsk grunn, for eksempel 'til saus', 'til topping' eller 'til servering'.",
    `- Hold deg under 40 minutter med mindre allowLongerTime er ${input.allowLongerTime ? "true (lengre tid er ok)" : "false"}.`,
    "- Hold tonen praktisk og hverdagslig, med enkel fremgangsmåte og vanlige råvarer.",
    "- timeMinutes er obligatorisk og må være et realistisk totalestimat.",
    "- For valgfrie felt (servings, quantity, reason, notes): utelat nøkkelen hvis den ikke er relevant. Ikke bruk null.",
    "- missingIngredients må alltid være en array (bruk [] hvis ingen mangler).",
    "- id må være en kort kebab-case slug, for eksempel 'kylling-i-form'.",
    "- Output-format må være nøyaktig én av disse:",
    "  1) { \"recipe\": { ... }, \"assumptions\"?: [ ... ] }",
    "  2) { \"clarifyingQuestion\": \"...\" }",
    "- Hvis du er usikker, still nøyaktig ett clarifyingQuestion og ikke inkluder recipe eller assumptions.",
    "- Hvis du kan gjøre en rimelig antakelse, returner recipe og eventuelt assumptions. Ikke inkluder clarifyingQuestion i så fall.",
    "",
    "Eksempel på oppskriftssvar:",
    recipeExample,
    "",
    "Eksempel på avklaringsspørsmål:",
    clarifyingExample,
    "",
    `Brukerens ingredienser:\n${ingredientsText}`,
    `Brukerens preferanser: ${preferencesText}`,
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
            "Du er en matlagingsassistent. Svar kun med gyldig JSON som følger kravene, og skriv all tekst på norsk bokmål.",
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

function parseAndValidateRecipe(
  raw: string,
  requestId: string,
  attempt: number
): GeneratedRecipeResult | null {
  try {
    const parsed = JSON.parse(raw);
    const result = GeneratedRecipeResultSchema.safeParse(parsed);
    if (!result.success) {
      console.warn("[ai.validate.schema_error]", {
        requestId,
        attempt,
        issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
      return null;
    }

    const languageValidation = validateLanguageAndUnits(result.data);
    if (!languageValidation.ok) {
      console.warn("[ai.validate.language_error]", {
        requestId,
        attempt,
        reason: languageValidation.reason,
        match: languageValidation.match,
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

function validateLanguageAndUnits(
  result: GeneratedRecipeResult
): { ok: true } | { ok: false; reason: "english_phrase" | "invalid_unit"; match: string } {
  const textParts: string[] = [];

  if ("clarifyingQuestion" in result) {
    textParts.push(result.clarifyingQuestion);
  } else {
    textParts.push(result.recipe.title);
    textParts.push(...result.recipe.steps);
    textParts.push(...result.recipe.ingredients.map((ingredient) => ingredient.item));
    textParts.push(
      ...result.recipe.ingredients
        .map((ingredient) => ingredient.quantity)
        .filter((value): value is string => typeof value === "string")
    );
    textParts.push(...result.recipe.missingIngredients.map((ingredient) => ingredient.item));
    textParts.push(
      ...result.recipe.missingIngredients
        .map((ingredient) => ingredient.reason)
        .filter((value): value is string => typeof value === "string")
    );
    textParts.push(...(result.recipe.notes ?? []));
    textParts.push(...(result.assumptions ?? []));
  }

  const joined = textParts.join("\n");

  for (const pattern of CLEAR_ENGLISH_PATTERNS) {
    const match = joined.match(pattern);
    if (match) {
      return { ok: false, reason: "english_phrase", match: match[0] };
    }
  }

  for (const pattern of FORBIDDEN_UNIT_PATTERNS) {
    const match = joined.match(pattern);
    if (match) {
      return { ok: false, reason: "invalid_unit", match: match[0] };
    }
  }

  return { ok: true };
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
  const retryPrompt =
    `${basePrompt}\nForrige svar var ugyldig. Returner gyldig JSON på norsk bokmål uten engelske fraser eller ugyldige enheter.`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await requestModel(attempt === 1 ? basePrompt : retryPrompt, apiKey);
      const parsedResult = parseAndValidateRecipe(raw, requestId, attempt);

      if (parsedResult) {
        if ("clarifyingQuestion" in parsedResult) {
          return {
            ok: true,
            result: { clarifyingQuestion: parsedResult.clarifyingQuestion },
            attempts: attempt,
          };
        }

        return {
          ok: true,
          result: {
            recipe: parsedResult.recipe,
            assumptions: parsedResult.assumptions,
          },
          attempts: attempt,
        };
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
