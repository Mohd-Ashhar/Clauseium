import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { resolveClauseDecision } from "./shared/decisions";
import { DISCLAIMER_LONG } from "./shared/disclaimer";
import { BRAND_NAME, colors } from "./shared/branding";
import { formatLongDate, contractTypeFullLabel } from "@/lib/format";
import type { ExportInput } from "./index";

export async function generateCleanDocx(input: ExportInput): Promise<Blob> {
  const { contract, clauseStates } = input;
  const clauses = contract.clauses ?? [];

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: contract.title, bold: true, size: 36 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `${contractTypeFullLabel(contract.contractType)} · v${contract.version}`,
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
  ];

  for (const clause of clauses) {
    const decision = resolveClauseDecision(clause, clauseStates[clause.id], "clean");
    if (decision.kind === "drop") continue;

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 320, after: 120 },
        children: [
          new TextRun({
            text: `§ ${clause.clauseNumber}  ${clause.title}`,
            bold: true,
          }),
        ],
      }),
    );

    const text =
      decision.kind === "original" || decision.kind === "insertion" || decision.kind === "manual-edit"
        ? decision.text
        : "";

    children.push(
      new Paragraph({
        spacing: { after: 120, line: 320 },
        children: [new TextRun({ text })],
      }),
    );

    if (decision.kind === "manual-edit" && decision.needsWork) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: "[Reviewer note: manual edits required before sending.]",
              italics: true,
              color: colors.riskMed.replace("#", ""),
              size: 18,
            }),
          ],
        }),
      );
    }
  }

  children.push(
    new Paragraph({
      spacing: { before: 720, after: 120 },
      children: [
        new TextRun({
          text: `Prepared with ${BRAND_NAME} · ${formatLongDate(new Date())}`,
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
    description: `Clean export of ${contract.title}`,
    sections: [{ children }],
  });

  return await Packer.toBlob(doc);
}
