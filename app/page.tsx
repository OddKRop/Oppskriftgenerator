'use client'

import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import type { GeneratedRecipe } from "@/lib/schema/generatedRecipe";
import { useMemo, useState } from "react";

export default function Home() {
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [ingredientsInput, setIngredientsInput] = useState("");
  const [preferencesInput, setPreferencesInput] = useState("");
  const [allowLongerTime, setAllowLongerTime] = useState(false);

  const parsedIngredients = useMemo(
    () =>
      ingredientsInput
        .split(/,|\n/)
        .map((value) => value.trim())
        .filter(Boolean),
    [ingredientsInput]
  );

  const generateRecipe = async () => {
    if (parsedIngredients.length === 0) {
      setRecipeError("Legg inn minst en ingrediens.");
      return;
    }

    setIsLoading(true);
    setRecipeError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: parsedIngredients,
          preferences: preferencesInput.trim() || undefined,
          allowLongerTime,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          const detailText =
            Array.isArray(data.details) && data.details.length > 0
              ? ` (${data.details.join(", ")})`
              : "";
          setRecipeError(`Ugyldig input${detailText}`);
        } else {
          setRecipeError("Kunne ikke generere oppskrift na. Proev igjen.");
        }
        return;
      }

      setRecipe(data.recipe as GeneratedRecipe);
    } catch {
      setRecipeError("Nettverksfeil under generering. Proev igjen.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetRecipe = () => {
    setRecipe(null);
    setRecipeError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-10 shadow-xl shadow-black/30 md:px-10">
        <h1 className="text-3xl font-bold text-zinc-100">Oppskriftgenerator AI</h1>

        <div className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-800 p-4">
          <div>
            <label htmlFor="ingredients" className="mb-2 block text-sm font-medium text-zinc-300">
              Ingredienser (komma eller ny linje)
            </label>
            <textarea
              id="ingredients"
              value={ingredientsInput}
              onChange={(event) => setIngredientsInput(event.target.value)}
              rows={4}
              placeholder="kylling, ris, paprika"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="preferences" className="mb-2 block text-sm font-medium text-zinc-300">
              Preferanser (valgfritt)
            </label>
            <input
              id="preferences"
              value={preferencesInput}
              onChange={(event) => setPreferencesInput(event.target.value)}
              placeholder="f.eks. uten meieri, sterk mat"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={allowLongerTime}
              onChange={(event) => setAllowLongerTime(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-900"
            />
            Tillat over 40 minutter
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={generateRecipe}
            disabled={isLoading}
            className="rounded-lg bg-zinc-100 px-5 py-3 font-medium text-zinc-900 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Generer oppskrift
          </button>
          <button
            onClick={resetRecipe}
            disabled={isLoading}
            className="rounded-lg border border-zinc-700 px-5 py-3 font-medium text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Nullstill
          </button>
        </div>

        <section className="w-full rounded-xl border border-zinc-700 bg-zinc-800 p-6 text-zinc-100">
          {isLoading ? (
            <LoadingState text="Generating..." />
          ) : recipeError ? (
            <ErrorState title="Generering feilet" message={recipeError} onRetry={generateRecipe} />
          ) : !recipe ? (
            <EmptyState
              title="Ingen oppskrift enda"
              description="Legg inn ingredienser og trykk Generer oppskrift."
              ctaLabel="Generer na"
              onAction={generateRecipe}
            />
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold">{recipe.title}</h2>
                <p className="mt-1 text-sm text-zinc-400">ID: {recipe.id}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-300">
                  {typeof recipe.servings === "number" ? <span>Porsjoner: {recipe.servings}</span> : null}
                  {typeof recipe.timeMinutes === "number" ? <span>Tid: {recipe.timeMinutes} min</span> : null}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-lg font-semibold">Ingredienser</h3>
                <ul className="list-disc space-y-1 pl-5">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={`${ingredient.item}-${index}`}>
                      {ingredient.item}
                      {ingredient.quantity ? ` (${ingredient.quantity})` : ""}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-lg font-semibold">Fremgangsmate</h3>
                <ol className="list-decimal space-y-2 pl-5">
                  {recipe.steps.map((step, index) => (
                    <li key={`${index}-${step}`}>{step}</li>
                  ))}
                </ol>
              </div>

              {recipe.missingIngredients.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Mangler</h3>
                  <ul className="list-disc space-y-1 pl-5 text-zinc-300">
                    {recipe.missingIngredients.map((item, index) => (
                      <li key={`${item.item}-${index}`}>
                        {item.item}
                        {item.reason ? ` - ${item.reason}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {recipe.notes && recipe.notes.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Notater</h3>
                  <ul className="list-disc space-y-1 pl-5 text-zinc-300">
                    {recipe.notes.map((note, index) => (
                      <li key={`${index}-${note}`}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
