'use client'

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import {
  getFavoriteRecipeById,
  isRecipeFavorited,
  removeFavoriteRecipe,
  upsertFavoriteRecipe,
} from "@/lib/favorites/favoritesStorage";
import type { GeneratedRecipe } from "@/lib/schema/generatedRecipe";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const searchParams = useSearchParams();
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [ingredientsInput, setIngredientsInput] = useState("");
  const [preferencesInput, setPreferencesInput] = useState("");
  const [allowLongerTime, setAllowLongerTime] = useState(false);
  const [isCurrentRecipeFavorited, setIsCurrentRecipeFavorited] = useState(false);
  const [clarifyingQuestion, setClarifyingQuestion] = useState<string | null>(null);
  const [assumptions, setAssumptions] = useState<string[]>([]);

  const favoriteRecipeId = searchParams.get("favorite");
  const hasRecipe = Boolean(recipe);

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
    setClarifyingQuestion(null);

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
          setRecipeError("Kunne ikke generere oppskrift nå. Prøv igjen.");
        }
        return;
      }

      if (typeof data.clarifyingQuestion === "string" && data.clarifyingQuestion.trim().length > 0) {
        setRecipe(null);
        setAssumptions([]);
        setClarifyingQuestion(data.clarifyingQuestion);
        return;
      }

      if (!data.recipe) {
        setRecipeError("Uventet svar fra AI. Prøv igjen.");
        setRecipe(null);
        setAssumptions([]);
        return;
      }

      setRecipe(data.recipe as GeneratedRecipe);
      setAssumptions(Array.isArray(data.assumptions) ? data.assumptions : []);
    } catch {
      setRecipeError("Nettverksfeil under generering. Prøv igjen.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetRecipe = () => {
    setRecipe(null);
    setRecipeError(null);
    setClarifyingQuestion(null);
    setAssumptions([]);
  };

  const handleCopyMissingIngredients = async () => {
    if (!recipe || !recipe.missingIngredients || recipe.missingIngredients.length === 0) {
      return;
    }

    const lines = recipe.missingIngredients
      .slice(0, 5)
      .map((item) => (item.reason ? `${item.item} - ${item.reason}` : item.item))
      .join("\n");

    if (!lines) return;

    try {
      await navigator.clipboard.writeText(lines);
    } catch (error) {
      console.error("Failed to copy shopping list", error);
    }
  };

  const handleToggleFavorite = () => {
    if (!recipe) {
      return;
    }

    if (isRecipeFavorited(recipe.id)) {
      removeFavoriteRecipe(recipe.id);
      setIsCurrentRecipeFavorited(false);
      return;
    }

    upsertFavoriteRecipe(recipe);
    setIsCurrentRecipeFavorited(true);
  };

  useEffect(() => {
    if (!recipe) {
      setIsCurrentRecipeFavorited(false);
      return;
    }

    setIsCurrentRecipeFavorited(isRecipeFavorited(recipe.id));
  }, [recipe]);

  useEffect(() => {
    if (!favoriteRecipeId) {
      return;
    }

    const favorite = getFavoriteRecipeById(favoriteRecipeId);
    if (!favorite) {
      setRecipeError("Fant ikke favorittoppskriften i lokal lagring.");
      return;
    }

    setRecipe(favorite.recipe);
    setRecipeError(null);
    setClarifyingQuestion(null);
    setAssumptions([]);
  }, [favoriteRecipeId]);

  return (
    <div className={`min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100 ${hasRecipe ? "pb-32" : ""}`}>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-10 shadow-xl shadow-black/30 md:px-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-zinc-100">Oppskriftgenerator AI</h1>
          <Link
            href="/favorites"
            className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
          >
            Favoritter
          </Link>
        </div>

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
          ) : clarifyingQuestion ? (
            <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-4 text-amber-100">
              <h2 className="text-lg font-semibold">Avklaringsspørsmål fra AI</h2>
              <p className="mt-1 text-sm">{clarifyingQuestion}</p>
              <p className="mt-3 text-sm text-amber-200">
                Oppdater ingredienser eller preferanser over, og trykk Generer oppskrift igjen.
              </p>
            </div>
          ) : !recipe ? (
            <EmptyState
              title="Ingen oppskrift enda"
              description="Legg inn ingredienser og trykk Generer oppskrift."
              ctaLabel="Generer nå"
              onAction={generateRecipe}
            />
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-3xl font-semibold leading-tight md:text-4xl">{recipe.title}</h2>
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    aria-pressed={isCurrentRecipeFavorited}
                    className="hidden rounded-md border border-zinc-600 px-3 py-1 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 md:inline-flex"
                  >
                    {isCurrentRecipeFavorited ? "★ Favoritt" : "☆ Legg til favoritt"}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-400">
                  {typeof recipe.servings === "number" ? <span>Porsjoner: {recipe.servings}</span> : null}
                  {typeof recipe.timeMinutes === "number" ? <span>Tid: {recipe.timeMinutes} min</span> : null}
                </div>
              </div>

              {assumptions.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-lg font-semibold">Antakelser</h3>
                  <ul className="list-disc space-y-1 pl-5 text-zinc-300">
                    {assumptions.map((assumption, index) => (
                      <li key={`${index}-${assumption}`}>{assumption}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <h3 className="mb-2 text-lg font-semibold">Ingredienser</h3>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li
                      key={`${ingredient.item}-${index}`}
                      className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2"
                    >
                      <span className="mt-1 h-4 w-4 rounded-sm border border-zinc-500" aria-hidden />
                      <span className="text-zinc-100">
                        {ingredient.item}
                        {ingredient.quantity ? ` (${ingredient.quantity})` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-lg font-semibold">Fremgangsmåte</h3>
                <ol className="space-y-3">
                  {recipe.steps.map((step, index) => (
                    <li
                      key={`${index}-${step}`}
                      className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-3"
                    >
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-900">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Manglende ingredienser (må kjøpes)</h3>
                  {recipe.missingIngredients.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleCopyMissingIngredients}
                      className="rounded-md border border-zinc-600 px-3 py-1 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700"
                    >
                      Kopier handleliste
                    </button>
                  ) : null}
                </div>
                {recipe.missingIngredients.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-zinc-300">
                    {recipe.missingIngredients.slice(0, 5).map((item, index) => (
                      <li key={`${item.item}-${index}`}>
                        {item.item}
                        {item.reason ? ` - ${item.reason}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-emerald-400">
                    You can make this with what you have ✅
                  </p>
                )}
              </div>

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

      {hasRecipe ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-700 bg-zinc-950/95 p-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl gap-3">
            <button
              type="button"
              onClick={generateRecipe}
              disabled={isLoading}
              className="flex-1 rounded-lg bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Generer ny
            </button>
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-pressed={isCurrentRecipeFavorited}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-zinc-600 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCurrentRecipeFavorited ? "★ Favoritt" : "☆ Favoritt"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
