import { NextResponse } from "next/server";
import { generateRecipeFromAI } from "@/lib/ai/generateRecipe";
import { GenerateRecipeInputSchema } from "@/lib/schema/generatedRecipe";

type InvalidInputBody = {
  error: string;
  details?: string[];
  requestId: string;
};

type ServerErrorBody = {
  error: string;
  requestId: string;
};

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAtMs = Date.now();

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    const body: InvalidInputBody = {
      error: "Invalid JSON body.",
      requestId,
    };
    return NextResponse.json(body, { status: 400 });
  }

  const parsedInput = GenerateRecipeInputSchema.safeParse(payload);
  if (!parsedInput.success) {
    const details = parsedInput.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "body";
      return `${path}: ${issue.message}`;
    });

    console.warn("[api.generate.invalid_input]", {
      requestId,
      details,
    });

    const body: InvalidInputBody = {
      error: "Invalid input.",
      details,
      requestId,
    };
    return NextResponse.json(body, { status: 400 });
  }

  const input = parsedInput.data;

  console.info("[api.generate.request]", {
    requestId,
    ingredientCount: input.ingredients.length,
    hasPreferences: Boolean(input.preferences?.trim()),
    allowLongerTime: input.allowLongerTime,
  });

  const result = await generateRecipeFromAI(input, requestId);
  const durationMs = Date.now() - startedAtMs;

  if (!result.ok) {
    console.error("[api.generate.failed]", {
      requestId,
      code: result.code,
      attempts: result.attempts,
      durationMs,
    });

    const body: ServerErrorBody = {
      error:
        result.code === "missing_api_key"
          ? "Server missing AI configuration."
          : "Failed to generate recipe. Please try again.",
      requestId,
    };

    return NextResponse.json(body, { status: 500 });
  }

  console.info("[api.generate.success]", {
    requestId,
    attempts: result.attempts,
    durationMs,
    missingIngredientCount: result.recipe.missingIngredients.length,
  });

  return NextResponse.json(
    {
      requestId,
      recipe: result.recipe,
    },
    { status: 200 }
  );
}
