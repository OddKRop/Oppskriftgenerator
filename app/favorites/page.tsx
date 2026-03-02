"use client";

import Link from "next/link";
import { useState } from "react";
import {
  getFavoriteRecipes,
  removeFavoriteRecipe,
  type FavoriteRecipe,
} from "@/lib/favorites/favoritesStorage";

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Ukjent dato";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>(() => getFavoriteRecipes());

  const handleRemove = (id: string) => {
    removeFavoriteRecipe(id);
    setFavorites(getFavoriteRecipes());
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-10 shadow-xl shadow-black/30 md:px-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold text-zinc-100">Favoritter</h1>
          <Link
            href="/"
            className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
          >
            Tilbake
          </Link>
        </div>

        {favorites.length === 0 ? (
          <p className="rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-zinc-300">
            Du har ingen favoritter enda.
          </p>
        ) : (
          <ul className="space-y-3">
            {favorites.map((favorite) => (
              <li
                key={favorite.id}
                className="rounded-xl border border-zinc-700 bg-zinc-800 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{favorite.title}</h2>
                    <p className="text-sm text-zinc-400">
                      Lagret: {formatCreatedAt(favorite.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/?favorite=${encodeURIComponent(favorite.id)}`}
                      className="rounded-md border border-zinc-600 px-3 py-1 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700"
                    >
                      Åpne
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(favorite.id)}
                      className="rounded-md border border-red-800 px-3 py-1 text-sm font-medium text-red-200 transition hover:bg-red-900/40"
                    >
                      Fjern
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
