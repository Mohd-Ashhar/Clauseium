export const CLASSIFICATION_CATEGORIES = [
  "indemnification",
  "limitation_of_liability",
  "termination",
  "governing_law",
  "jurisdiction",
  "data_protection_dpdp",
  "payment_terms",
  "ip_assignment",
] as const;

export type ClassificationCategory = (typeof CLASSIFICATION_CATEGORIES)[number];

export const OTHER_CATEGORY = "other" as const;

export type ClassificationLabel = ClassificationCategory | typeof OTHER_CATEGORY;

export const ALL_LABELS = [
  ...CLASSIFICATION_CATEGORIES,
  OTHER_CATEGORY,
] as const;

export function isClassificationCategory(
  value: string,
): value is ClassificationCategory {
  return (CLASSIFICATION_CATEGORIES as readonly string[]).includes(value);
}

export function isClassificationLabel(
  value: string,
): value is ClassificationLabel {
  return (ALL_LABELS as readonly string[]).includes(value);
}
