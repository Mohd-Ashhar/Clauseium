// Wire and DB shapes for the document ingestion pipeline.
// UI-facing analyzed shapes live in src/types/contract.ts.

export type JobStatus = "queued" | "processing" | "ready" | "failed";

export interface Clause {
  id: string;
  text: string;
  position: number;
}

export interface Section {
  title: string;
  clauses: Clause[];
}

export interface StructuredDocument {
  sections: Section[];
}

export interface ContractRecord {
  id: string;
  owner_user_id: string;
  title: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  page_count: number | null;
  storage_path: string;
  status: JobStatus;
  error_message: string | null;
  structured_json: StructuredDocument | null;
  uploaded_at: string;
  processed_at: string | null;
}

export interface ClauseRow {
  id: string;
  contract_id: string;
  section_title: string;
  section_position: number;
  clause_number: string | null;
  clause_text: string;
  position: number;
  created_at: string;
}

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
