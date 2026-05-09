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
  // 6-element affine matrix [a, b, c, d, e, f]; element [5] is the y-coord
  // of the text item's baseline. When two items share the same y, they're
  // on the same visual line; a y-change means a new line.
  transform: [number, number, number, number, number, number];
}

interface PageData {
  getTextContent(opts: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }): Promise<{ items: PageDataItem[] }>;
}

// Mirror pdf-parse's default pagerender: insert a newline whenever the y-coord
// of the next text item changes. `item.hasEOL` alone is unreliable (most PDFs
// emit it false for every item), which collapses the entire page into one
// long line and breaks downstream clause detection.
async function renderPage(
  pageData: PageData,
  collected: string[],
): Promise<string> {
  const content = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });
  let lastY: number | null = null;
  let pageText = "";
  for (const item of content.items) {
    const y = item.transform[5];
    if (lastY === null || y === lastY) {
      pageText += item.str;
    } else {
      pageText += "\n" + item.str;
    }
    lastY = y;
  }
  collected.push(pageText);
  return pageText;
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  const pageTexts: string[] = [];

  const result = await pdfParse(buffer, {
    pagerender: ((pageData: PageData) =>
      renderPage(pageData, pageTexts)) as unknown as (
      pd: unknown,
    ) => string | Promise<string>,
  });

  return {
    text: result.text,
    pageCount: result.numpages,
    pageTexts,
  };
}
