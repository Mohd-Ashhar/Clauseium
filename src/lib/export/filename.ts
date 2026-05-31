import type { ExportFormat } from "./index";

const formatSuffix: Record<ExportFormat, string> = {
  redlined: "redlined",
  clean: "clean",
  summary: "risk-summary",
  full: "full-report",
};

const extensionFor: Record<ExportFormat, string> = {
  redlined: "docx",
  clean: "docx",
  summary: "pdf",
  full: "pdf",
};

export function slug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "")
    || "contract";
}

function yyyymmdd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export function buildFilename(args: {
  contract: { title: string; version: number };
  format: ExportFormat;
}): string {
  const { contract, format } = args;
  const base = slug(contract.title);
  const v = `v${contract.version}`;
  const date = yyyymmdd(new Date());
  return `${base}-${formatSuffix[format]}-${v}-${date}.${extensionFor[format]}`;
}

export const mimeTypeFor: Record<ExportFormat, string> = {
  redlined:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  clean:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  summary: "application/pdf",
  full: "application/pdf",
};
