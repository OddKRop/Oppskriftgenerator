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
  invalidate();
}

/**
 * localStorage er en ekstern kilde, og React trenger et stabilt øyeblikksbilde
 * for å lese den trygt. Uten mellomlagring ville hvert kall gitt et nytt array,
 * og useSyncExternalStore ville rendret i evig løkke.
 */
let snapshot: FavoriteRecipe[] | null = null;

// Egen konstant, ikke et nytt tomt array per kall — samme grunn som over.
const EMPTY: FavoriteRecipe[] = [];

const listeners = new Set<() => void>();

function invalidate(): void {
  snapshot = null;
  for (const listener of listeners) {
    listener();
  }
}

export function getFavoriteRecipes(): FavoriteRecipe[] {
  if (!snapshot) {
    snapshot = readFavorites().sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }

  return snapshot;
}

/** Serveren har ingen favoritter. Alltid samme referanse, ellers loop. */
export function getServerFavoritesSnapshot(): FavoriteRecipe[] {
  return EMPTY;
}

/** Varsler også om endringer gjort i en annen fane. */
export function subscribeToFavorites(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === FAVORITES_STORAGE_KEY || event.key === null) {
      invalidate();
    }
  };

  if (isBrowser()) {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(listener);
    if (isBrowser()) {
      window.removeEventListener("storage", onStorage);
    }
  };
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
