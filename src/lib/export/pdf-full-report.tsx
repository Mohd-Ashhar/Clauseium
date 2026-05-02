import { pdf } from "@react-pdf/renderer";
import { FullReportDocument } from "./pdf/FullReportDocument";
import type { ExportInput } from "./index";

export async function generateFullReportPdf(input: ExportInput): Promise<Blob> {
  const instance = pdf(
    <FullReportDocument
      contract={input.contract}
      clauseStates={input.clauseStates}
      includeReasoning={input.includeReasoning}
    />,
  );
  return await instance.toBlob();
}
