import { z } from "zod";
import { ALL_LABELS } from "./categories";

export const classificationLabelSchema = z.enum(ALL_LABELS);

export const llmClassificationResponseSchema = z.object({
  category: classificationLabelSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(240).optional().default(""),
});

export type LlmClassificationResponse = z.infer<
  typeof llmClassificationResponseSchema
>;

export const classificationResultSchema = z.object({
  clauseId: z.string().min(1),
  category: classificationLabelSchema,
  confidence: z.number().min(0).max(1),
  method: z.enum(["rule", "llm", "rule_llm_agree"]),
  matchedRule: z.string().nullable(),
  model: z.string().nullable(),
  reasoning: z.string().nullable(),
});
