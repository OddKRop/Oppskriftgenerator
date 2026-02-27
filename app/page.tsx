'use client'

import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import { recipeCategories } from "@/lib/schema/recipes";
import getRandomRecipe from "@/lib/utils/getRandomRecipe";
import type { Recipe, RecipeCategory } from "@/types/recipe";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Home() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecipeVisible, setIsRecipeVisible] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"alle" | RecipeCategory>("alle");
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAiConfig = useCallback(async () => {
    setIsCheckingConfig(true);
    setConfigError(null);

    try {
      const response = await fetch("/api/ai/health");
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setConfigError("AI config mangler. Legg OPENAI_API_KEY i .env.local.");
      }
    } catch {
      setConfigError("Klarte ikke sjekke AI-oppsett. Proev igjen.");
    } finally {
      setIsCheckingConfig(false);
    }
  }, []);

  useEffect(() => {
    checkAiConfig();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [checkAiConfig]);

  const handleCategoryChange = (value: "alle" | RecipeCategory) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsLoading(false);
    setRecipe(null);
    setIsRecipeVisible(false);
    setSelectedCategory(value);
  };

  const handleGetRecipe = () => {
    if (configError || isCheckingConfig) {
      return;
    }

    setIsLoading(true);
    setIsRecipeVisible(false);
    setRecipeError(null);

    const categoryFilter = selectedCategory === "alle" ? undefined : selectedCategory;

    timerRef.current = setTimeout(() => {
      try {
        setRecipe((prevRecipe) => {
          let nextRecipe = getRandomRecipe(categoryFilter);
          let attempts = 0;

          while (prevRecipe && nextRecipe.title === prevRecipe.title && attempts < 10) {
            nextRecipe = getRandomRecipe(categoryFilter);
            attempts++;
          }
          return nextRecipe;
        });
      } catch {
        setRecipeError("Kunne ikke hente oppskrift akkurat naa.");
      } finally {
        setIsLoading(false);

        requestAnimationFrame(() => {
          setIsRecipeVisible(true);
        });
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-10 shadow-xl shadow-black/30 md:px-10">
        <h1 className="text-3xl font-bold text-zinc-100">Oppskriftgenerator</h1>
        <div className="w-full max-w-sm">
          <label htmlFor="category" className="mb-2 block text-sm font-medium text-zinc-300">
            Velg kategori
          </label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(event) => handleCategoryChange(event.target.value as "alle" | RecipeCategory)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
          >
            {recipeCategories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGetRecipe}
          disabled={isLoading || isCheckingConfig || Boolean(configError)}
          className="rounded-lg bg-zinc-100 px-5 py-3 font-medium text-zinc-900 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCheckingConfig ? "Sjekker oppsett..." : "Gi meg en oppskrift"}
        </button>
        <section className="w-full rounded-xl border border-zinc-700 bg-zinc-800 p-6 text-zinc-100">
          {configError ? (
            <ErrorState
              title="AI-oppsett mangler"
              message={configError}
              onRetry={checkAiConfig}
              retryLabel="Sjekk paa nytt"
            />
          ) : isLoading ? (
            <LoadingState text="Generating..." />
          ) : recipeError ? (
            <ErrorState message={recipeError} onRetry={handleGetRecipe} />
          ) : !recipe ? (
            <EmptyState
              title="Ingen oppskrift enda"
              description="Velg kategori og trykk paa knappen for aa generere en oppskrift."
              ctaLabel="Generer na"
              onAction={handleGetRecipe}
            />
          ) : (
            <div className={`transition-opacity duration-500 ${isRecipeVisible ? "opacity-100" : "opacity-0"}`}>
              <h2 className="mb-4 text-2xl font-semibold">{recipe.title}</h2>
              <h3 className="mb-2 text-lg font-semibold">Ingredienser</h3>
              <ul className="mb-6 list-disc space-y-1 pl-5">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                ))}
              </ul>

              <h3 className="mb-2 text-lg font-semibold">Fremgangsmåte</h3>
              <ol className="list-decimal space-y-2 pl-5">
                {recipe.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
