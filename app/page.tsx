'use client'

import getRandomRecipe from "@/lib/recipes/getRandomRecipe";
import type { Recipe } from "@/lib/recipes/types";
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecipeVisible, setIsRecipeVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleGetRecipe = () => {
    setIsLoading(true);
    setIsRecipeVisible(false);

    timerRef.current = setTimeout(() => {
      const randomRecipe = getRandomRecipe();
      setRecipe(randomRecipe);
      setIsLoading(false);

      requestAnimationFrame(() => {
        setIsRecipeVisible(true);
      });
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 rounded-2xl bg-white px-6 py-10 shadow-sm md:px-10">
        <h1 className="text-3xl font-bold text-slate-900">Oppskriftgenerator</h1>
        <button
          onClick={handleGetRecipe}
          disabled={isLoading}
          className="rounded-lg bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Henter oppskrift..." : "Gi meg en oppskrift"}
        </button>
        <section className="w-full rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-800">
          {isLoading ? (
            <p className="animate-pulse text-slate-600">Henter oppskrift...</p>
          ) : !recipe ? (
            <p className="text-slate-600">Her kommer oppskriften</p>
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
