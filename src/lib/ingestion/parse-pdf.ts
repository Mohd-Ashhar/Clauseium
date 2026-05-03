import "server-only";
import { PDFParse } from "pdf-parse";

export interface ParsedPdf {
  text: string;
  pageCount: number;
  pageTexts: string[];
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText({ pageJoiner: "" });
    const pageTexts = result.pages.map((p) => p.text);
    return {
      text: result.text ?? pageTexts.join("\n"),
      pageCount: result.total,
      pageTexts,
    };
  } finally {
    await parser.destroy();
  }
}
