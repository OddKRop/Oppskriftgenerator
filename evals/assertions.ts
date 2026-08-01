import type { GeneratedRecipe } from "@/lib/schema/generatedRecipe";
import { userProvidedIngredient } from "@/lib/utils/ingredientMatching";

export type Outcome =
  | { kind: "recipe"; recipe: GeneratedRecipe; assumptions: string[] }
  | { kind: "clarifyingQuestion"; question: string };

export type AssertionContext = {
  ingredients: string[];
};

// Returnerer null når kravet holder, ellers en kort forklaring på hva som brøt.
export type Assertion = (outcome: Outcome, context: AssertionContext) => string | null;

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Hvilke felter et innholdskrav leser.
 *
 * "ingredients" er standard for kost- og allergikrav: det er ingredienslista
 * som er kontrakten. Fremgangsmåten gir falske treff — «Smør formen» er et
 * verb, ikke meieriprodukt — og en tittel som «frokostgrøt» inneholder «ost».
 * "all" finnes for krav der fritekst faktisk er det interessante.
 */
export type Scope = "ingredients" | "all";

function recipeText(recipe: GeneratedRecipe, scope: Scope): string[] {
  const items = [
    ...recipe.ingredients.map((ingredient) => ingredient.item),
    ...recipe.missingIngredients.map((ingredient) => ingredient.item),
  ];

  if (scope === "ingredients") {
    return items;
  }

  return [recipe.title, ...items, ...recipe.steps, ...(recipe.notes ?? [])];
}

function words(text: string[]): string[] {
  return text
    .join(" ")
    .toLowerCase()
    .split(/[^a-zæøå]+/i)
    .filter(Boolean);
}

/** Oppskriften må kunne lages innen et gitt antall minutter. */
export function maxTime(minutes: number): Assertion {
  return (outcome) => {
    if (outcome.kind !== "recipe") {
      return null;
    }

    return outcome.recipe.timeMinutes > minutes
      ? `timeMinutes er ${outcome.recipe.timeMinutes}, kravet er maks ${minutes}`
      : null;
  };
}

export type ForbidOptions = {
  /**
   * Treffer også inni sammensatte ord: «kylling» fanger «kyllingfilet».
   * Bruk kun for ledd som er entydige — «ost» ville truffet «frokost».
   */
  substrings?: string[];
  /** Krever helt ord. Brukes for korte ledd som ellers gir falske treff. */
  words?: string[];
  /** Ord som ser ut som treff, men ikke er det — typisk plantealternativer. */
  allow?: string[];
  scope?: Scope;
};

/**
 * Ingen av de forbudte ordene skal forekomme. Ordet som slo ut rapporteres i
 * klartekst, slik at et eventuelt falskt treff er lett å kjenne igjen framfor
 * å bli tatt for en ekte regresjon.
 */
export function forbidsWords(label: string, options: ForbidOptions): Assertion {
  const substrings = (options.substrings ?? []).map(normalize);
  const exactWords = new Set((options.words ?? []).map(normalize));
  const allowSet = new Set((options.allow ?? []).map(normalize));
  const scope = options.scope ?? "ingredients";

  return (outcome) => {
    if (outcome.kind !== "recipe") {
      return null;
    }

    for (const word of words(recipeText(outcome.recipe, scope))) {
      if (allowSet.has(word)) {
        continue;
      }

      if (exactWords.has(word)) {
        return `${label}: fant «${word}»`;
      }

      const hit = substrings.find((needle) => word.includes(needle));
      if (hit) {
        return `${label}: fant «${word}» (treff på «${hit}»)`;
      }
    }

    return null;
  };
}

/** Oppskriften skal faktisk bruke det brukeren har, ikke finne på noe nytt. */
export function usesAtLeast(count: number): Assertion {
  return (outcome, context) => {
    if (outcome.kind !== "recipe") {
      return null;
    }

    const used = outcome.recipe.ingredients.map((ingredient) => normalize(ingredient.item));
    const matched = context.ingredients.filter((ingredient) => {
      const needle = normalize(ingredient);
      return used.some((item) => item.includes(needle) || needle.includes(item));
    });

    return matched.length < count
      ? `brukte ${matched.length} av brukerens ${context.ingredients.length} ingredienser, kravet er minst ${count}`
      : null;
  };
}

/**
 * Regresjonsvakt for enforceMissingIngredientsConsistency: hver ingrediens i
 * oppskriften som brukeren ikke oppga, skal stå i missingIngredients.
 * Produksjonskoden fyller inn det modellen glemmer, så dette skal alltid holde
 * — slår det ut, er det appen som har røket, ikke modellen.
 */
export function missingIngredientsConsistent(): Assertion {
  return (outcome, context) => {
    if (outcome.kind !== "recipe") {
      return null;
    }

    // Samme matcher som produksjonskoden, ellers ville kravet slått ut på
    // nettopp de tilfellene appen med vilje regner som dekket.
    const listedAsMissing = new Set(
      outcome.recipe.missingIngredients.map((ingredient) => normalize(ingredient.item))
    );

    const unaccounted = outcome.recipe.ingredients
      .map((ingredient) => ingredient.item)
      .filter(
        (item) =>
          !userProvidedIngredient(item, context.ingredients) &&
          !listedAsMissing.has(normalize(item))
      );

    // Grensen på 5 i skjemaet kutter lista, så et overskytende avvik er
    // forventet oppførsel og ikke en feil.
    if (unaccounted.length > 0 && outcome.recipe.missingIngredients.length < 5) {
      return `ikke ført opp som manglende: ${unaccounted.join(", ")}`;
    }

    return null;
  };
}
