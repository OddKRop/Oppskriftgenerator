import type { GeneratedRecipe } from "@/lib/schema/generatedRecipe";

const FAVORITES_STORAGE_KEY = "recipe_favorites_v1";

export type FavoriteRecipe = {
  id: string;
  title: string;
  createdAt: string;
  summary?: string;
  recipe: GeneratedRecipe;
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readFavorites(): FavoriteRecipe[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is FavoriteRecipe => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const candidate = item as Partial<FavoriteRecipe>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.title === "string" &&
        typeof candidate.createdAt === "string" &&
        typeof candidate.recipe === "object" &&
        candidate.recipe !== null
      );
    });
  } catch {
    return [];
  }
}

function writeFavorites(favorites: FavoriteRecipe[]): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}

export function getFavoriteRecipes(): FavoriteRecipe[] {
  return readFavorites().sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
}

export function getFavoriteRecipeById(id: string): FavoriteRecipe | null {
  const favorites = readFavorites();
  return favorites.find((favorite) => favorite.id === id) ?? null;
}

export function isRecipeFavorited(id: string): boolean {
  const favorites = readFavorites();
  return favorites.some((favorite) => favorite.id === id);
}

export function upsertFavoriteRecipe(recipe: GeneratedRecipe): FavoriteRecipe {
  const favorites = readFavorites();
  const existing = favorites.find((favorite) => favorite.id === recipe.id);

  if (existing) {
    const updated: FavoriteRecipe = {
      ...existing,
      title: recipe.title,
      summary: recipe.notes?.[0],
      recipe,
    };

    const next = favorites.map((favorite) => (favorite.id === recipe.id ? updated : favorite));
    writeFavorites(next);
    return updated;
  }

  const created: FavoriteRecipe = {
    id: recipe.id,
    title: recipe.title,
    createdAt: new Date().toISOString(),
    summary: recipe.notes?.[0],
    recipe,
  };

  writeFavorites([created, ...favorites]);
  return created;
}

export function removeFavoriteRecipe(id: string): void {
  const favorites = readFavorites();
  const next = favorites.filter((favorite) => favorite.id !== id);
  writeFavorites(next);
}
