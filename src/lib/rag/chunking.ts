import { detectStructure } from "@/lib/ingestion/structure";
import { normalize } from "@/lib/ingestion/normalize";
import type {
  CaseSeed,
  ChunkInput,
  Metadata,
  StatuteSeed,
} from "@/lib/rag/types";

const MAX_PART_CHARS = 1800;

export function chunkStatute(seed: StatuteSeed): ChunkInput[] {
  const out: ChunkInput[] = [];
  let ord = 0;
  const baseMeta = (section: string): Metadata => ({
    source: "statute",
    statute_name: seed.statute_name,
    section,
    year: seed.year,
    jurisdiction: "India",
    url: seed.url,
  });

  for (const sec of seed.sections) {
    const cleanedBody = normalize({ text: sec.body });
    const heading = `Section ${sec.number} — ${sec.heading}`;
    const sectionText = `${seed.statute_name}\n${heading}\n\n${cleanedBody}`;

    out.push({
      ord: ord++,
      text: sectionText,
      metadata: baseMeta(sec.number),
    });

    const structured = detectStructure(cleanedBody);
    const subClauses = structured.sections
      .flatMap((s) => s.clauses)
      .filter((c) => c.text.length >= 80);

    const onlyOneClause =
      subClauses.length === 1 && subClauses[0].text.trim() === cleanedBody.trim();

    if (subClauses.length > 1 && !onlyOneClause) {
      for (const sub of subClauses) {
        const subSection = extractLeadingNumber(sub.text) ?? sub.text.slice(0, 8);
        out.push({
          ord: ord++,
          text: `${seed.statute_name}\n${heading}\n\n${sub.text}`,
          metadata: baseMeta(`${sec.number}${subSection ? `(${subSection})` : ""}`),
        });
      }
    }
  }

  return out;
}

export function chunkCase(seed: CaseSeed): ChunkInput[] {
  const out: ChunkInput[] = [];
  let ord = 0;
  const meta: Metadata = {
    source: "case",
    case_name: seed.case_name,
    citation: seed.citation,
    court: seed.court,
    year: seed.year,
    jurisdiction: "India",
    url: seed.url,
  };

  const prefix = `${seed.case_name} (${seed.citation})`;

  if (seed.headnote) {
    const headnote = normalize({ text: seed.headnote });
    out.push({
      ord: ord++,
      text: `${prefix} — headnote:\n\n${headnote}`,
      metadata: meta,
    });
  }

  for (const part of seed.parts) {
    const cleaned = normalize({ text: part.text });
    const sub = splitLong(cleaned);
    for (const segment of sub) {
      out.push({
        ord: ord++,
        text: `${prefix} — ${part.label}:\n\n${segment}`,
        metadata: meta,
      });
    }
  }

  return out;
}

function splitLong(text: string): string[] {
  if (text.length <= MAX_PART_CHARS) return [text];

  const paras = text.split(/\n{2,}/);
  const out: string[] = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).trim().length > MAX_PART_CHARS && buf.length > 0) {
      out.push(buf.trim());
      buf = p;
    } else {
      buf = buf.length === 0 ? p : `${buf}\n\n${p}`;
    }
  }
  if (buf.trim().length > 0) out.push(buf.trim());

  return out.flatMap((segment) => {
    if (segment.length <= MAX_PART_CHARS) return [segment];
    const structured = detectStructure(segment);
    const clauses = structured.sections
      .flatMap((s) => s.clauses.map((c) => c.text))
      .filter((t) => t.length <= MAX_PART_CHARS);
    if (clauses.length > 0) return clauses;
    return hardSplit(segment);
  });
}

function hardSplit(text: string): string[] {
  const parts: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let buf = "";
  for (const s of sentences) {
    if (s.length > MAX_PART_CHARS) {
      if (buf.length > 0) {
        parts.push(buf.trim());
        buf = "";
      }
      for (let i = 0; i < s.length; i += MAX_PART_CHARS) {
        parts.push(s.slice(i, i + MAX_PART_CHARS));
      }
      continue;
    }
    if ((buf + " " + s).trim().length > MAX_PART_CHARS && buf.length > 0) {
      parts.push(buf.trim());
      buf = s;
    } else {
      buf = buf.length === 0 ? s : `${buf} ${s}`;
    }
  }
  if (buf.trim().length > 0) parts.push(buf.trim());
  return parts;
}

function extractLeadingNumber(text: string): string | null {
  const m = /^\s*\(?([0-9]+|[a-z]{1,3})\)?\s+/i.exec(text);
  return m ? m[1] : null;
}
