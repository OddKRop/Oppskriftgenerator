import { NextResponse } from "next/server";
import { generateRecipeFromAI } from "@/lib/ai/generateRecipe";
import { GenerateRecipeInputSchema } from "@/lib/schema/generatedRecipe";
import { checkRateLimit } from "@/lib/security/ratelimit";

type InvalidInputBody = {
  error: string;
  details?: string[];
  requestId: string;
};

type ServerErrorBody = {
  error: string;
  requestId: string;
};

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAtMs = Date.now();
  const ip = getClientIp(request);
  const limit = await checkRateLimit(ip);

  if (!limit.ok) {
    console.warn("[RateLimit]", {
      ip,
      reason: limit.reason,
      path: "/api/generate",
    });

    const reset = limit.reset ?? Math.ceil((Date.now() + 60_000) / 1000);
    const retryAfter = Math.max(1, reset - Math.ceil(Date.now() / 1000));

    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Reset": String(reset),
        },
      }
    );
  }

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
    hasClarifyingQuestion: "clarifyingQuestion" in result.result,
    missingIngredientCount:
      "recipe" in result.result ? result.result.recipe.missingIngredients.length : undefined,
  });

  const successPayload =
    "clarifyingQuestion" in result.result
      ? {
          requestId,
          clarifyingQuestion: result.result.clarifyingQuestion,
        }
      : {
          requestId,
          recipe: result.result.recipe,
          assumptions: result.result.assumptions ?? [],
        };

  return NextResponse.json(
    successPayload,
    { status: 200 }
  );
}
