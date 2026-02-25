
import { recipes } from "./data"

export default function getRandomRecipe() {
    const randomRecipeIndex = Math.floor(Math.random() * recipes.length);
    return recipes[randomRecipeIndex];
}


