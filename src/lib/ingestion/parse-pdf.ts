import "server-only";
import pdfParse from "pdf-parse";

export interface ParsedPdf {
  text: string;
  pageCount: number;
  pageTexts: string[];
}

// Use the legacy pdfjs build path bundled with pdf-parse v1. v2 transitively
// pulls in modern pdfjs which references DOMMatrix (a browser-only DOM API),
// breaking on Vercel's Node serverless runtime with:
//   ReferenceError: DOMMatrix is not defined
// v1 + the v1.10.100 build is well-known-stable in serverless Node.

interface PageDataItem {
  str: string;
  hasEOL?: boolean;
}

interface PageData {
  getTextContent(opts: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }): Promise<{ items: PageDataItem[] }>;
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  const pageTexts: string[] = [];

  const renderPage = async (pageData: PageData): Promise<string> => {
    const content = await pageData.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    });
    let pageText = "";
    for (const item of content.items) {
      pageText += item.str;
      if (item.hasEOL) pageText += "\n";
    }
    pageTexts.push(pageText);
    return pageText;
  };

  const result = await pdfParse(buffer, {
    pagerender: renderPage as unknown as (pd: unknown) => string | Promise<string>,
  });

  return {
    text: result.text,
    pageCount: result.numpages,
    pageTexts,
  };
}
