import { z } from "zod";

export const GenerateRecipeInputSchema = z.object({
  ingredients: z.array(z.string().trim().min(1)).min(1).max(30),
  preferences: z.string().trim().max(500).optional(),
  allowLongerTime: z.boolean().optional().default(false),
});

export const RecipeIngredientSchema = z.object({
  item: z.string().trim().min(1),
  quantity: z.string().trim().min(1).nullish().transform((v) => v ?? undefined),
});

export const MissingIngredientSchema = z.object({
  item: z.string().trim().min(1),
  reason: z.string().trim().max(200).nullish().transform((v) => v ?? undefined),
});

export const GeneratedRecipeSchema = z.object({
  id: z.string().trim().min(1).max(80),
  title: z.string().trim().min(2).max(120),
  servings: z.number().int().min(1).max(12).nullish().transform((v) => v ?? undefined),
  timeMinutes: z.number().int().min(1).max(240),
  ingredients: z.array(RecipeIngredientSchema).min(1).max(30),
  steps: z.array(z.string().trim().min(1)).min(1).max(20),
  missingIngredients: z.array(MissingIngredientSchema).max(5).nullish().transform((v) => v ?? []),
  notes: z
    .array(z.string().trim().min(1).max(200))
    .max(8)
    .nullish()
    .transform((v) => v ?? undefined),
});

const ClarifyingQuestionSchema = z.object({
  clarifyingQuestion: z.string().trim().min(5).max(240),
});

const RecipeAnswerSchema = z.object({
  recipe: GeneratedRecipeSchema,
  assumptions: z.array(z.string().trim().min(1).max(200)).max(3).optional(),
});

export const GeneratedRecipeResultSchema = z
  .union([ClarifyingQuestionSchema, RecipeAnswerSchema])
  .superRefine((value, ctx) => {
    if ("clarifyingQuestion" in value && "assumptions" in value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot include assumptions with clarifyingQuestion.",
        path: ["assumptions"],
      });
    }
  });

export type GenerateRecipeInput = z.infer<typeof GenerateRecipeInputSchema>;
export type GeneratedRecipe = z.infer<typeof GeneratedRecipeSchema>;
export type GeneratedRecipeResult = z.infer<typeof GeneratedRecipeResultSchema>;
