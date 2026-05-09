import type { Contract } from "@/types/contract";
import type { ClauseState } from "./types";
import { buildFilename, mimeTypeFor } from "./filename";

export type ExportFormat = "redlined" | "clean" | "summary" | "full";

export interface ExportInput {
  contract: Contract;
  clauseStates: Record<string, ClauseState>;
  format: ExportFormat;
  includeReasoning: boolean;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  mimeType: string;
}

export async function exportContract(input: ExportInput): Promise<ExportResult> {
  const filename = buildFilename({ contract: input.contract, format: input.format });
  const mimeType = mimeTypeFor[input.format];

  switch (input.format) {
    case "redlined": {
      const { generateRedlinedDocx } = await import("./docx-redlined");
      const blob = await generateRedlinedDocx(input);
      return { blob, filename, mimeType };
    }
    case "clean": {
      const { generateCleanDocx } = await import("./docx-clean");
      const blob = await generateCleanDocx(input);
      return { blob, filename, mimeType };
    }
    case "summary": {
      const { generateSummaryPdf } = await import("./pdf-summary");
      const blob = await generateSummaryPdf(input);
      return { blob, filename, mimeType };
    }
    case "full": {
      const { generateFullReportPdf } = await import("./pdf-full-report");
      const blob = await generateFullReportPdf(input);
      return { blob, filename, mimeType };
    }
  }
}
