import { z } from "zod";

export const GenerateRecipeInputSchema = z.object({
  ingredients: z.array(z.string().trim().min(1)).min(1).max(30),
  preferences: z.string().trim().max(500).optional(),
  allowLongerTime: z.boolean().optional().default(false),
});

export const RecipeIngredientSchema = z.object({
  item: z.string().trim().min(1),
  quantity: z.string().trim().min(1).optional(),
});

export const MissingIngredientSchema = z.object({
  item: z.string().trim().min(1),
  reason: z.string().trim().max(200).optional(),
});

export const GeneratedRecipeSchema = z.object({
  id: z.string().trim().min(4).max(80),
  title: z.string().trim().min(2).max(120),
  servings: z.number().int().min(1).max(12).optional(),
  timeMinutes: z.number().int().min(1).max(240).optional(),
  ingredients: z.array(RecipeIngredientSchema).min(1).max(30),
  steps: z.array(z.string().trim().min(1)).min(1).max(20),
  missingIngredients: z.array(MissingIngredientSchema).max(5),
  notes: z.array(z.string().trim().min(1).max(200)).max(8).optional(),
});

export type GenerateRecipeInput = z.infer<typeof GenerateRecipeInputSchema>;
export type GeneratedRecipe = z.infer<typeof GeneratedRecipeSchema>;
