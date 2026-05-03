import { z } from "zod";

export const RISK_LEVELS = ["high", "medium", "low", "standard", "missing"] as const;

export const riskLevelSchema = z.enum(RISK_LEVELS);

export const llmRiskResponseSchema = z.object({
  risk_level: riskLevelSchema,
  issue: z.string().trim().min(1).max(160),
  explanation: z.string().trim().min(1).max(600),
  suggestion: z.string().trim().min(0).max(400).optional().default(""),
  confidence: z.number().min(0).max(1),
});

export type LlmRiskResponse = z.infer<typeof llmRiskResponseSchema>;
