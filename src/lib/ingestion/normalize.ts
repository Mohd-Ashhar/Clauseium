const PAGE_NUMBER_REGEX = /^\s*(?:Page\s+)?\d+(?:\s*\/\s*\d+)?\s*$/i;
const RUNNING_HEADER_HINT = /^(Confidential|Draft|Privileged|Strictly\s+Private)\b/i;

export interface NormalizeInput {
  text: string;
  pageTexts?: string[];
}

export function normalize(input: NormalizeInput): string {
  const base =
    input.pageTexts && input.pageTexts.length > 1
      ? removeRunningHeadersFooters(input.pageTexts).join("\n")
      : input.text;

  return collapseWhitespace(dehyphenate(stripPageNumbers(base)));
}

export function removeRunningHeadersFooters(pageTexts: string[]): string[] {
  if (pageTexts.length < 3) return pageTexts;

  const firstLines = pageTexts.map(firstNonEmptyLine);
  const lastLines = pageTexts.map(lastNonEmptyLine);

  const recurringHeader = mostCommonRecurring(firstLines);
  const recurringFooter = mostCommonRecurring(lastLines);

  return pageTexts.map((page) => {
    let lines = page.split("\n");
    if (recurringHeader) {
      lines = dropFirstMatching(lines, (line) => line.trim() === recurringHeader);
    }
    if (recurringFooter) {
      lines = dropLastMatching(lines, (line) => line.trim() === recurringFooter);
    }
    lines = lines.filter((line) => !RUNNING_HEADER_HINT.test(line.trim()));
    return lines.join("\n");
  });
}

export function stripPageNumbers(text: string): string {
  return text
    .split("\n")
    .filter((line) => !PAGE_NUMBER_REGEX.test(line))
    .join("\n");
}

export function dehyphenate(text: string): string {
  // Word break across lines: "indemni-\nfication" -> "indemnification"
  return text.replace(/(\w)-\n(\w)/g, "$1$2");
}

export function collapseWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function firstNonEmptyLine(page: string): string {
  for (const line of page.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return "";
}

function lastNonEmptyLine(page: string): string {
  const lines = page.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.length > 0) return trimmed;
  }
  return "";
}

function mostCommonRecurring(lines: string[]): string | null {
  const counts = new Map<string, number>();
  for (const line of lines) {
    if (line.length === 0 || line.length > 120) continue;
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  let best: { line: string; count: number } | null = null;
  for (const [line, count] of counts) {
    if (!best || count > best.count) best = { line, count };
  }
  // Only treat as running if it appears on >= 60% of pages and at least 3 times.
  if (best && best.count >= 3 && best.count >= Math.ceil(lines.length * 0.6)) {
    return best.line;
  }
  return null;
}

function dropFirstMatching(lines: string[], pred: (line: string) => boolean): string[] {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().length === 0) continue;
    if (pred(lines[i])) return [...lines.slice(0, i), ...lines.slice(i + 1)];
    return lines;
  }
  return lines;
}

function dropLastMatching(lines: string[], pred: (line: string) => boolean): string[] {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim().length === 0) continue;
    if (pred(lines[i])) return [...lines.slice(0, i), ...lines.slice(i + 1)];
    return lines;
  }
  return lines;
}
