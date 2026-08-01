import "server-only";
import { getModelClient, getModelName } from "@/lib/ai/modelClient";
import {
  GeneratedRecipeResultSchema,
  type GenerateRecipeInput,
  type GeneratedRecipe,
  type GeneratedRecipeResult,
} from "@/lib/schema/generatedRecipe";
import {
  normalizeIngredient,
  preferredSpelling,
  userProvidedIngredient,
} from "@/lib/utils/ingredientMatching";
import type OpenAI from "openai";

type GenerateRecipeResult =
  | {
      ok: true;
      result: { recipe: GeneratedRecipe; assumptions?: string[] } | { clarifyingQuestion: string };
      attempts: number;
    }
  | {
      ok: false;
      code: "provider_error" | "invalid_model_output";
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

/**
 * Retter modellens stavefeil i ingredienslista mot brukerens egen skrivemåte.
 *
 * gemma4:e4b skriver jevnlig «bana» for «banan». Matchingen håndterer det
 * allerede, så varen havner ikke feilaktig i handlelista — men den feilstavede
 * teksten ble stående i oppskriften brukeren leser. Kun rene skrivefeil rettes;
 * bøyningsformer får stå.
 *
 * Fremgangsmåten røres ikke. Der står ordet som regel riktig, og
 * tekstutbytting i fritekst er en mye lettere måte å ødelegge en setning på.
 */
function applyUserSpelling(
  recipe: GeneratedRecipe,
  userIngredients: string[]
): { recipe: GeneratedRecipe; correctedCount: number } {
  let correctedCount = 0;

  const ingredients = recipe.ingredients.map((ingredient) => {
    const item = preferredSpelling(ingredient.item, userIngredients);
    if (item !== ingredient.item) {
      correctedCount++;
      return { ...ingredient, item };
    }
    return ingredient;
  });

  return { recipe: { ...recipe, ingredients }, correctedCount };
}

function enforceMissingIngredientsConsistency(
  recipe: GeneratedRecipe,
  userIngredients: string[]
): { recipe: GeneratedRecipe; autoAddedCount: number } {
  const uniqueRecipeIngredients: Array<{ item: string; normalized: string }> = [];
  const seenRecipeIngredients = new Set<string>();

  for (const ingredient of recipe.ingredients) {
    const normalized = normalizeIngredient(ingredient.item);
    if (!normalized || seenRecipeIngredients.has(normalized)) {
      continue;
    }

    seenRecipeIngredients.add(normalized);
    uniqueRecipeIngredients.push({
      item: ingredient.item,
      normalized,
    });
  }

  // Streng likhet ville felt varer brukeren faktisk har: modellen skriver
  // «tomater» der brukeren skrev «hakkede tomater», og en skrivefeil som
  // «bana» for «banan» endte som manglende vare i handlelista.
  const missingFromUser = uniqueRecipeIngredients.filter(
    (ingredient) => !userProvidedIngredient(ingredient.item, userIngredients)
  );

  const missingByKey = new Map(
    recipe.missingIngredients.map((ingredient) => [normalizeIngredient(ingredient.item), ingredient] as const)
  );

  const normalizedMissing = missingFromUser.map((ingredient) => {
    const fromModel = missingByKey.get(ingredient.normalized);
    return (
      fromModel ?? {
        item: ingredient.item,
        reason: "ikke oppgitt av bruker",
      }
    );
  });

  const nextMissingIngredients = normalizedMissing.slice(0, 5);
  const autoAddedCount = nextMissingIngredients.filter(
    (ingredient) => !missingByKey.has(normalizeIngredient(ingredient.item))
  ).length;

  return {
    recipe: {
      ...recipe,
      missingIngredients: nextMissingIngredients,
    },
    autoAddedCount,
  };
}

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
      }
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
    "- Du må sammenligne brukerens ingrediensliste strengt mot oppskriftens fulle ingrediensliste.",
    "- Hver ingrediens i recipe.ingredients som ikke finnes i brukerens ingrediensliste må stå i missingIngredients.",
    "- Ta bare med faktisk manglende ingredienser i missingIngredients (varer brukeren ikke har oppgitt).",
    "- Ikke anta at brukeren har basisvarer i skapet med mindre de er eksplisitt oppgitt.",
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
    "- assumptions er kun for korte, praktiske antakelser som er tydelig avledet av brukerens input.",
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

async function requestModel(
  prompt: string,
  client: OpenAI,
  requestId: string,
  attempt: number
): Promise<string> {
  const promptWords = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;

  console.log("[ai.generate.prompt_length]", {
    requestId,
    attempt,
    promptChars: prompt.length,
    promptWords,
  });

  // Ollama implementerer /v1/chat/completions, ikke Responses-API-et, så dette
  // kallet kan ikke bruke client.responses.create.
  const response = await client.chat.completions.create({
    model: getModelName(),
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
  });

  console.log("[ai.generate.usage]", {
    requestId,
    attempt,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
  });

  const content = response.choices[0]?.message?.content;

  // Resonneringsmodeller (f.eks. qwen3.6) legger tankerekken i et eget
  // reasoning-felt og kan returnere tomt content hvis de går tom for tokens
  // før selve svaret. Da er retry riktig oppførsel.
  if (!content?.trim()) {
    throw new Error(
      `Modellen ${getModelName()} returnerte tomt svar (finish_reason: ${
        response.choices[0]?.finish_reason ?? "ukjent"
      }).`
    );
  }

  return content;
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
  const client = getModelClient();
  const basePrompt = buildPrompt(input);
  const retryPrompt =
    `${basePrompt}\nForrige svar var ugyldig. Returner gyldig JSON på norsk bokmål uten engelske fraser eller ugyldige enheter. Husk at alle manglende ingredienser må listes i missingIngredients.`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await requestModel(
        attempt === 1 ? basePrompt : retryPrompt,
        client,
        requestId,
        attempt
      );
      const parsedResult = parseAndValidateRecipe(raw, requestId, attempt);

      if (parsedResult) {
        if ("clarifyingQuestion" in parsedResult) {
          return {
            ok: true,
            result: { clarifyingQuestion: parsedResult.clarifyingQuestion },
            attempts: attempt,
          };
        }

        const spellingFixed = applyUserSpelling(parsedResult.recipe, input.ingredients);
        if (spellingFixed.correctedCount > 0) {
          console.warn("[ai.generate.spelling_corrected]", {
            requestId,
            attempt,
            correctedCount: spellingFixed.correctedCount,
          });
        }

        const consistencyChecked = enforceMissingIngredientsConsistency(
          spellingFixed.recipe,
          input.ingredients
        );
        if (consistencyChecked.autoAddedCount > 0) {
          console.warn("[ai.generate.missing_ingredients_auto_added]", {
            requestId,
            attempt,
            autoAddedCount: consistencyChecked.autoAddedCount,
          });
        }

        return {
          ok: true,
          result: {
            recipe: consistencyChecked.recipe,
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
