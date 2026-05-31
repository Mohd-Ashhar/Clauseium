import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { SummaryDocument } from "./pdf/SummaryDocument";
import { FullReportDocument } from "./pdf/FullReportDocument";
import type { Contract } from "@/types/contract";
import type { ClauseState } from "./types";

// Server-side PDF rendering for the export route. @react-pdf/renderer's
// renderToBuffer runs under the Node runtime and returns a Buffer we can stream
// straight back as the download.

export async function renderSummaryPdf(contract: Contract): Promise<Buffer> {
  return renderToBuffer(<SummaryDocument contract={contract} />);
}

export async function renderFullReportPdf(
  contract: Contract,
  clauseStates: Record<string, ClauseState>,
): Promise<Buffer> {
  return renderToBuffer(
    <FullReportDocument
      contract={contract}
      clauseStates={clauseStates}
      includeReasoning
    />,
  );
}
