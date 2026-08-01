"use client";

import { ingredientsMentionedIn } from "@/lib/utils/ingredientMatching";
import type { GeneratedRecipe } from "@/lib/schema/generatedRecipe";

type CookModeProps = {
  recipe: GeneratedRecipe;
  stepIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export default function CookMode({ recipe, stepIndex, onPrev, onNext, onExit }: CookModeProps) {
  const step = recipe.steps[stepIndex] ?? "";
  const isLast = stepIndex >= recipe.steps.length - 1;

  // Datamodellen kobler ikke steg til ingredienser, så vi leter dem opp igjen i
  // teksten. Finner vi ingenting, vises linja ikke — bedre enn å gjette.
  const needs = ingredientsMentionedIn(
    step,
    recipe.ingredients.map((ingredient) => ingredient.item)
  );

  return (
    <div className="flex min-h-full flex-col px-6 pt-7 pb-6">
      <div
        aria-hidden
        className="font-medium leading-[0.85] tracking-[-0.05em] text-step-num text-[90px]"
      >
        {pad(stepIndex + 1)}
      </div>

      <p className="mt-5 text-[22px] leading-[1.45] text-pretty text-text">{step}</p>

      <div className="mt-[18px] h-px bg-gradient-to-r from-accent to-transparent" />

      {needs.length > 0 ? (
        <p className="mt-3 text-sm text-muted">{needs.join(" · ")}</p>
      ) : null}

      <div className="flex-1" />

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={stepIndex === 0}
          className="px-1 py-2.5 text-sm font-medium text-faint transition-colors hover:text-accent-1 disabled:opacity-40 disabled:hover:text-faint"
        >
          ‹ Forrige
        </button>

        <span className="font-mono text-xs text-dim">
          {stepIndex + 1} / {recipe.steps.length}
        </span>

        <button
          type="button"
          onClick={onNext}
          className="px-1 py-2.5 text-sm font-medium text-accent-1 transition-colors hover:text-text"
        >
          {isLast ? "Ferdig ›" : "Neste ›"}
        </button>
      </div>

      <button
        type="button"
        onClick={onExit}
        className="mt-1.5 py-2 text-center text-xs text-dim transition-colors hover:text-muted"
      >
        Tilbake til oppskriften
      </button>
    </div>
  );
}
