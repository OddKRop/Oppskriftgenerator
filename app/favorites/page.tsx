"use client";

import SectionLabel from "@/components/SectionLabel";
import TabBar from "@/components/TabBar";
import {
  getFavoriteRecipes,
  getServerFavoritesSnapshot,
  removeFavoriteRecipe,
  subscribeToFavorites,
  type FavoriteRecipe,
} from "@/lib/favorites/favoritesStorage";
import Link from "next/link";
import { useSyncExternalStore } from "react";

function formatMeta(favorite: FavoriteRecipe): string {
  const parts: string[] = [`${favorite.recipe.timeMinutes} MIN`];

  if (typeof favorite.recipe.servings === "number") {
    parts.push(`${favorite.recipe.servings} PORSJONER`);
  }

  const date = new Date(favorite.createdAt);
  if (!Number.isNaN(date.getTime())) {
    parts.push(
      new Intl.DateTimeFormat("nb-NO", {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
      }).format(date)
    );
  }

  return parts.join(" · ");
}

export default function FavoritesPage() {
  // Siden prerendres, og localStorage finnes ikke da. useSyncExternalStore lar
  // serveren rendre tom liste og klienten fylle den uten hydreringsavvik.
  const favorites = useSyncExternalStore(
    subscribeToFavorites,
    getFavoriteRecipes,
    getServerFavoritesSnapshot
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-text">
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pt-7 pb-8">
        <SectionLabel wide>Lagret</SectionLabel>
        <h1 className="mt-2.5 mb-5 text-[34px] font-medium tracking-[-0.03em]">Favoritter</h1>

        {favorites.length === 0 ? (
          <p className="border-t border-line-soft pt-4 text-sm text-muted">
            Du har ingen favoritter enda. Lagre en oppskrift med stjerna øverst i forslaget.
          </p>
        ) : (
          <ul>
            {favorites.map((favorite) => (
              <li
                key={favorite.id}
                className="flex items-start gap-3 border-t border-line-soft py-3.5 last:border-b"
              >
                <Link href={`/?favorite=${encodeURIComponent(favorite.id)}`} className="min-w-0 flex-1">
                  <div className="text-lg font-medium text-text">{favorite.title}</div>
                  <div className="mt-1 font-mono text-xs text-faint">{formatMeta(favorite)}</div>
                </Link>
                <button
                  type="button"
                  onClick={() => removeFavoriteRecipe(favorite.id)}
                  aria-label={`Fjern ${favorite.title}`}
                  className="shrink-0 px-2 py-2 text-xs text-dim transition-colors hover:text-danger"
                >
                  fjern
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <TabBar active="favs" />
    </div>
  );
}
