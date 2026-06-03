// Hex constants pulled from /src/app/globals.css design tokens.
// Used by both DOCX and PDF generators so colors stay in sync with the UI.

export const colors = {
  ink950: "#050505",
  ink900: "#0a0b0d",
  ink850: "#0d0f12",
  ink800: "#14171c",
  ink700: "#1f2329",
  ink500: "#6b7280",
  ink300: "#c5c8ce",
  ink100: "#f0f1f3",
  paper50: "#fafaf9",
  paper100: "#f4f4f2",
  paper200: "#e8e8e4",
  counsel500: "#c9a449",
  counsel600: "#a98736",
  riskHigh: "#e5484d",
  riskMed: "#f2a93b",
  riskLow: "#3dd68c",
  riskInfo: "#4cc2ff",
} as const;

export type RiskColorKey = "high" | "medium" | "low" | "standard" | "missing";

export function riskHex(level: RiskColorKey): string {
  switch (level) {
    case "high":
      return colors.riskHigh;
    case "medium":
      return colors.riskMed;
    case "low":
    case "standard":
      return colors.riskLow;
    case "missing":
      return colors.riskInfo;
  }
}

export function riskLabel(level: RiskColorKey): string {
  switch (level) {
    case "high":
      return "High risk";
    case "medium":
      return "Medium risk";
    case "low":
      return "Low risk";
    case "standard":
      return "Standard";
    case "missing":
      return "Missing clause";
  }
}

export const BRAND_NAME = "Clauseium";
export const AI_AUTHOR = "Clauseium AI";
