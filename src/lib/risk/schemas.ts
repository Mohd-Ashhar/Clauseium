import { z } from "zod";

export const RISK_LEVELS = ["high", "medium", "low", "standard", "missing"] as const;

export const riskLevelSchema = z.enum(RISK_LEVELS);

// No upper bound on the model-generated text fields. We previously rejected
// high-quality analysis (e.g. "Asymmetric regulatory reporting obligations…"
// type explanations of 700-1500 chars) just for going over arbitrary length
// caps. The model is still instructed in the system prompt to aim for
// ~140/500/350 chars; if it goes over, truncate at display time rather than
// discard the entire response.
export const llmRiskResponseSchema = z.object({
  risk_level: riskLevelSchema,
  issue: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  suggestion: z.string().trim().min(0).optional().default(""),
  confidence: z.number().min(0).max(1),
});

export type LlmRiskResponse = z.infer<typeof llmRiskResponseSchema>;
