import { z } from "zod";

export const metadataSchema = z.object({
  source: z.enum(["statute", "case"]),
  statute_name: z.string().optional(),
  section: z.string().optional(),
  court: z.string().optional(),
  year: z.number().int().optional(),
  jurisdiction: z.literal("India"),
  case_name: z.string().optional(),
  citation: z.string().optional(),
  url: z.string().url().optional(),
});
export type Metadata = z.infer<typeof metadataSchema>;

export const statuteSeedSchema = z.object({
  kind: z.literal("statute"),
  statute_name: z.string().min(1),
  year: z.number().int(),
  url: z.string().url().optional(),
  sections: z
    .array(
      z.object({
        number: z.string().min(1),
        heading: z.string().min(1),
        body: z.string().min(1),
      }),
    )
    .min(1),
});
export type StatuteSeed = z.infer<typeof statuteSeedSchema>;

export const casePartLabel = z.enum([
  "facts",
  "issues",
  "holding",
  "reasoning",
  "obiter",
]);
export type CasePartLabel = z.infer<typeof casePartLabel>;

export const caseSeedSchema = z.object({
  kind: z.literal("case"),
  case_name: z.string().min(1),
  citation: z.string().min(1),
  court: z.string().min(1),
  year: z.number().int(),
  url: z.string().url().optional(),
  headnote: z.string().optional(),
  parts: z
    .array(z.object({ label: casePartLabel, text: z.string().min(1) }))
    .min(1),
});
export type CaseSeed = z.infer<typeof caseSeedSchema>;

export const seedSchema = z.discriminatedUnion("kind", [
  statuteSeedSchema,
  caseSeedSchema,
]);
export type Seed = z.infer<typeof seedSchema>;

export interface ChunkInput {
  ord: number;
  text: string;
  metadata: Metadata;
}

export interface Chunk extends ChunkInput {
  document_id: string;
}

export interface HybridHit {
  chunk_id: string;
  document_id: string;
  text: string;
  metadata: Metadata;
  semantic: number;
  lexical: number;
  fused: number;
}

export interface LegalReference {
  id: string;
  document_id: string;
  text: string;
  metadata: Metadata;
  scores: { semantic: number; lexical: number; fused: number };
  citation_verified: true;
}
