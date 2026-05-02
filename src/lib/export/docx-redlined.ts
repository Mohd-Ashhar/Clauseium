import {
  AlignmentType,
  CommentRangeEnd,
  CommentRangeStart,
  CommentReference,
  DeletedTextRun,
  Document,
  HeadingLevel,
  type ICommentOptions,
  InsertedTextRun,
  type ParagraphChild,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { resolveClauseDecision } from "./shared/decisions";
import { DISCLAIMER_LONG, COMMENT_AUTHOR_INITIALS } from "./shared/disclaimer";
import { AI_AUTHOR, BRAND_NAME, colors, riskLabel } from "./shared/branding";
import { contractTypeFullLabel, formatLongDate } from "@/lib/format";
import type { ClauseAnalysis } from "@/types/contract";
import type { ExportInput } from "./index";

export async function generateRedlinedDocx(input: ExportInput): Promise<Blob> {
  const { contract, clauseStates, includeReasoning } = input;
  const clauses = contract.clauses ?? [];
  const now = new Date();

  let trackId = 1;
  let commentId = 1;
  const commentOptions: ICommentOptions[] = [];
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: contract.title, bold: true, size: 36 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${contractTypeFullLabel(contract.contractType)} · v${contract.version} · Redlined`,
          color: colors.ink500.replace("#", ""),
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 480 },
      children: [
        new TextRun({
          text: `Between: ${contract.counterparty}    Governing law: ${contract.governingLaw}`,
          color: colors.ink500.replace("#", ""),
          size: 18,
        }),
      ],
    }),
  );

  for (const clause of clauses) {
    const decision = resolveClauseDecision(clause, clauseStates[clause.id], "redlined");
    if (decision.kind === "drop") continue;

    const isInsertion = decision.kind === "insertion";
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 320, after: 80 },
        children: [
          new TextRun({
            text: `${isInsertion ? "[Proposed insertion] " : ""}§ ${clause.clauseNumber}  ${clause.title}`,
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: `${riskLabel(clause.riskLevel)} · ${clause.summary}`,
            italics: true,
            color: colors.ink500.replace("#", ""),
            size: 18,
          }),
        ],
      }),
    );

    const wantsComment = includeReasoning && Boolean(clause.reasoning?.trim());
    const thisCommentId = wantsComment ? commentId++ : null;

    const bodyChildren: ParagraphChild[] = [];
    if (thisCommentId !== null) {
      bodyChildren.push(new CommentRangeStart(thisCommentId));
    }

    if (decision.kind === "redline") {
      bodyChildren.push(
        new DeletedTextRun({
          text: decision.from,
          id: trackId++,
          author: AI_AUTHOR,
          date: now.toISOString(),
        }),
        new InsertedTextRun({
          text: ` ${decision.to}`,
          id: trackId++,
          author: AI_AUTHOR,
          date: now.toISOString(),
        }),
      );
    } else if (decision.kind === "insertion") {
      bodyChildren.push(
        new InsertedTextRun({
          text: decision.text,
          id: trackId++,
          author: AI_AUTHOR,
          date: now.toISOString(),
        }),
      );
    } else {
      bodyChildren.push(new TextRun({ text: decision.text }));
    }

    if (thisCommentId !== null) {
      bodyChildren.push(new CommentRangeEnd(thisCommentId));
      bodyChildren.push(new TextRun({ children: [new CommentReference(thisCommentId)] }));
      commentOptions.push(buildCommentOptions(thisCommentId, clause, now));
    }

    children.push(
      new Paragraph({
        spacing: { after: 120, line: 320 },
        children: bodyChildren,
      }),
    );

    if (decision.kind === "original" && decision.note) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: `[${decision.note}]`,
              italics: true,
              color: colors.ink500.replace("#", ""),
              size: 18,
            }),
          ],
        }),
      );
      if (clauseStates[clause.id] === "modified" && clause.suggestedRedline) {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: `AI suggestion: ${clause.suggestedRedline}`,
                italics: true,
                color: colors.ink500.replace("#", ""),
                size: 18,
              }),
            ],
          }),
        );
      }
    }
  }

  children.push(
    new Paragraph({
      spacing: { before: 720, after: 120 },
      children: [
        new TextRun({
          text: `Prepared with ${BRAND_NAME} · ${formatLongDate(now)}`,
          color: colors.ink500.replace("#", ""),
          size: 16,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: DISCLAIMER_LONG,
          color: colors.ink500.replace("#", ""),
          italics: true,
          size: 16,
        }),
      ],
    }),
  );

  const doc = new Document({
    creator: BRAND_NAME,
    title: contract.title,
    description: `Redlined export of ${contract.title}`,
    sections: [{ children }],
    ...(commentOptions.length > 0
      ? { comments: { children: commentOptions } }
      : {}),
  });

  return await Packer.toBlob(doc);
}

function buildCommentOptions(
  id: number,
  clause: ClauseAnalysis,
  date: Date,
): ICommentOptions {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({ text: riskLabel(clause.riskLevel), bold: true }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: clause.summary })],
    }),
  ];

  if (clause.reasoning) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 80 },
        children: [
          new TextRun({ text: "Reasoning: ", bold: true }),
          new TextRun({ text: clause.reasoning }),
        ],
      }),
    );
  }

  if (clause.citations.length > 0) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 80 },
        children: [new TextRun({ text: "Citations:", bold: true })],
      }),
    );
    for (const c of clause.citations) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `• ${c.text} (${c.status.replace("_", " ")})` }),
          ],
        }),
      );
    }
  }

  return {
    id,
    author: AI_AUTHOR,
    initials: COMMENT_AUTHOR_INITIALS,
    date,
    children: paragraphs,
  };
}
