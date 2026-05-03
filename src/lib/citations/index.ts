export {
  verifyCitationsForClause,
  verifyClauseAnalysis,
  extractCitations,
  applyQualityGate,
} from "./pipeline";
export type {
  VerifyInput,
  VerifyDeps,
  VerifyOutput,
} from "./pipeline";
export type {
  ExtractedCitation,
  SourceCheck,
  VerificationResult,
  VerifiedAnalysis,
  VerifyOptions,
  VerifyLogEntry,
  PipelineLogEntry,
  VerificationLogEntry,
} from "./types";
export { IndianKanoonUnavailableError, isKanoonAvailable } from "./indian-kanoon";
