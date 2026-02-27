export type RecipeCategory = "middag" | "lunsj" | "frokost" | "snack";

export type Recipe = {
  title: string;
  category: RecipeCategory;
  ingredients: string[];
  steps: string[];
};
