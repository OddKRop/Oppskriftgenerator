'use client'

import getRandomRecipe from "@/lib/recipes/getRandomRecipe";
import type { Recipe } from "@/lib/recipes/types";
import { useState } from 'react';

export default function Home() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  return (
    <div className="flex items-center justify-center  ">
      <main className="flex  w-full max-w-3xl flex-col gap-6 items-center py-16 px-16  ">
        <h1>Oppskriftgenerator</h1>
        <button >Gi meg en oppskrift</button>
        <section>
          <p>Her kommer oppskriften</p>
        </section>
      </main>
    </div>
  );
}
