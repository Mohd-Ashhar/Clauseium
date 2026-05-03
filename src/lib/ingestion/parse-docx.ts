import "server-only";
import mammoth from "mammoth";

export interface ParsedDocx {
  text: string;
  html: string;
  pageCount: number;
}

export async function parseDocx(buffer: Buffer): Promise<ParsedDocx> {
  const [textResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer }),
  ]);

  const text = textResult.value ?? "";
  const html = htmlResult.value ?? "";

  // Mammoth doesn't expose page boundaries. Form-feeds occur in some converters;
  // otherwise estimate ~3000 chars per page (rough but stable for sizing decisions).
  const formFeedCount = (text.match(/\f/g) ?? []).length;
  const pageCount =
    formFeedCount > 0 ? formFeedCount + 1 : Math.max(1, Math.ceil(text.length / 3000));

  return { text, html, pageCount };
}
