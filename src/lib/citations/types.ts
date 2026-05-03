import type { ClauseAnalysis, LegalCitation } from "@/types/contract";
import type {
  ExtractedCitation,
  SourceCheck,
  VerificationResult,
  VerifyLogEntry,
  PipelineLogEntry,
} from "./schemas";

export type {
  ExtractedCitation,
  SourceCheck,
  VerificationResult,
  VerifyLogEntry,
  PipelineLogEntry,
};

export type VerificationLogEntry = VerifyLogEntry | PipelineLogEntry;

export interface VerifiedAnalysis extends ClauseAnalysis {
  trustScore: number;
  citations: LegalCitation[];
  verificationLog: VerificationLogEntry[];
}

export interface VerifyOptions {
  signal?: AbortSignal;
  perCallTimeoutMs?: number;
}
