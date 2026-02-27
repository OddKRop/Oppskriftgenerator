import { recipes } from "@/lib/schema/recipes";
import type { Recipe, RecipeCategory } from "@/types/recipe";
import { getRandomItem } from "@/lib/utils/getRandomItem";

export default function getRandomRecipe(category?: RecipeCategory): Recipe {
  const filteredRecipes = category
    ? recipes.filter((recipe) => recipe.category === category)
    : recipes;

  const selected = getRandomItem(filteredRecipes.length > 0 ? filteredRecipes : recipes);

  if (!selected) {
    throw new Error("No recipes available. Add recipes in lib/schema/recipes.ts.");
  }

  return selected;
}
