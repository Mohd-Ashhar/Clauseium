import { Text, View } from "@react-pdf/renderer";
import type { LegalCitation, RiskLevel } from "@/types/contract";
import { riskHex, riskLabel } from "../shared/branding";
import { styles } from "./styles";

export function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <Text style={[styles.badge, { backgroundColor: riskHex(level) }]}>
      {riskLabel(level)}
    </Text>
  );
}

export function RiskCountCell({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.riskCell}>
      <Text style={[styles.riskCount, { color }]}>{count}</Text>
      <Text style={styles.riskCountLabel}>{label}</Text>
    </View>
  );
}

export function CitationLine({ c }: { c: LegalCitation }) {
  const tagStyle =
    c.status === "verified"
      ? styles.citationVerified
      : c.status === "partially_verified"
        ? styles.citationPartial
        : styles.citationUnverified;
  const tagText =
    c.status === "verified"
      ? "verified"
      : c.status === "partially_verified"
        ? "partial"
        : "unverified";
  return (
    <Text style={styles.citation}>
      • {c.text} <Text style={tagStyle}>({tagText})</Text>
    </Text>
  );
}
