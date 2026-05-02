import { pdf } from "@react-pdf/renderer";
import { SummaryDocument } from "./pdf/SummaryDocument";
import type { ExportInput } from "./index";

export async function generateSummaryPdf(input: ExportInput): Promise<Blob> {
  const instance = pdf(<SummaryDocument contract={input.contract} />);
  return await instance.toBlob();
}
