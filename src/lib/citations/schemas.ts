import { z } from "zod";

export const citationStatusSchema = z.enum([
  "verified",
  "partially_verified",
  "unverified",
]);
export type CitationStatusValue = z.infer<typeof citationStatusSchema>;

export const extractedCitationSchema = z.object({
  id: z.string().min(1),
  raw: z.string().min(1),
  caseOrStatute: z.string().min(1),
  // Empty for a name+year-only case token (e.g. "Puttaswamy v. Union of India |
  // | 2017"); statutes always carry a section. Validity is enforced by
  // `formatValid`, not by requiring this field to be non-empty.
  sectionOrCitation: z.string(),
  year: z.number().int().min(1800).max(3000).nullable(),
  formatValid: z.boolean(),
});
export type ExtractedCitation = z.infer<typeof extractedCitationSchema>;

export const sourceCheckSchema = z.object({
  checked: z.boolean(),
  confirmed: z.boolean(),
  url: z.string().url().optional(),
  relevance: z.number().min(0).max(1),
  latencyMs: z.number().int().min(0),
  error: z.string().nullable().default(null),
  cacheHit: z.boolean().optional(),
  // True only when the local source confirmed via an EXACT curated-corpus match
  // (statute_name + section, or case_name + year). A fuzzy hybrid-search hit
  // sets this false. Drives the "corpus match = verified" decision in verify.ts.
  exactMatch: z.boolean().optional(),
});
export type SourceCheck = z.infer<typeof sourceCheckSchema>;

export const verificationResultSchema = z.object({
  citation: extractedCitationSchema,
  status: citationStatusSchema,
  sourceUrl: z.string().url().optional(),
  confidence: z.number().min(0).max(1),
  local: sourceCheckSchema,
  kanoon: sourceCheckSchema,
});
export type VerificationResult = z.infer<typeof verificationResultSchema>;

export const verifyLogSchema = z.object({
  evt: z.literal("citation.verify"),
  ts: z.string(),
  citation_id: z.string(),
  raw: z.string(),
  clause_id: z.string(),
  sources: z.object({
    local: z.object({
      checked: z.boolean(),
      confirmed: z.boolean(),
      latency_ms: z.number().int(),
      relevance: z.number(),
      error: z.string().nullable(),
    }),
    kanoon: z.object({
      checked: z.boolean(),
      confirmed: z.boolean(),
      latency_ms: z.number().int(),
      error: z.string().nullable(),
      cache_hit: z.boolean().optional(),
    }),
  }),
  decision: z.object({
    status: citationStatusSchema,
    confidence: z.number(),
    dropped: z.boolean(),
    flagged: z.boolean(),
  }),
});
export type VerifyLogEntry = z.infer<typeof verifyLogSchema>;

export const pipelineLogSchema = z.object({
  evt: z.literal("citation.pipeline"),
  ts: z.string(),
  clause_id: z.string(),
  extracted: z.number().int(),
  verified: z.number().int(),
  partial: z.number().int(),
  dropped: z.number().int(),
  trust_score: z.number(),
  ms: z.number().int(),
});
export type PipelineLogEntry = z.infer<typeof pipelineLogSchema>;
