'use client'

import getRandomRecipe from "@/lib/recipes/getRandomRecipe";
import type { Recipe, RecipeCategory } from "@/lib/recipes/types";
import { useEffect, useRef, useState } from 'react';

const recipeCategories: Array<{ value: "alle" | RecipeCategory; label: string }> = [
  { value: "alle", label: "Alle" },
  { value: "middag", label: "Middag" },
  { value: "lunsj", label: "Lunsj" },
  { value: "frokost", label: "Frokost" },
  { value: "snack", label: "Snack" }
];

export default function Home() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecipeVisible, setIsRecipeVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"alle" | RecipeCategory>("alle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

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
    setIsLoading(true);
    setIsRecipeVisible(false);

    const categoryFilter = selectedCategory === "alle" ? undefined : selectedCategory;

    timerRef.current = setTimeout(() => {
      setRecipe((prevRecipe) => {
        let nextRecipe = getRandomRecipe(categoryFilter);
        let attempts = 0;

        // Unngå samme oppskrift to ganger på rad
        while (prevRecipe && nextRecipe.title === prevRecipe.title && attempts < 10) {
          nextRecipe = getRandomRecipe(categoryFilter);
          attempts++;
        }
        return nextRecipe;
      }
    );


      setIsLoading(false);

      requestAnimationFrame(() => {
        setIsRecipeVisible(true);
      }
    );
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
          disabled={isLoading}
          className="rounded-lg bg-zinc-100 px-5 py-3 font-medium text-zinc-900 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Henter oppskrift..." : "Gi meg en oppskrift"}
        </button>
        <section className="w-full rounded-xl border border-zinc-700 bg-zinc-800 p-6 text-zinc-100">
          {isLoading ? (
            <p className="animate-pulse text-zinc-400">Henter oppskrift...</p>
          ) : !recipe ? (
            <p className="text-zinc-400">Her kommer oppskriften</p>
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
