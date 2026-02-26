import { recipes } from "./data";
import type { RecipeCategory } from "./types";

export default function getRandomRecipe(category?: RecipeCategory) {
  const filteredRecipes = category
    ? recipes.filter((recipe) => recipe.category === category)
    : recipes;

  const pool = filteredRecipes.length > 0 ? filteredRecipes : recipes;
  const randomRecipeIndex = Math.floor(Math.random() * pool.length);

  return pool[randomRecipeIndex];
}
