import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { Contract } from "@/types/contract";
import { contractTypeFullLabel, formatLongDate } from "@/lib/format";
import { colors } from "../shared/branding";
import { DISCLAIMER_LONG } from "../shared/disclaimer";
import { CitationLine, MetaCell, RiskBadge, RiskCountCell } from "./components";
import { styles } from "./styles";

interface Props {
  contract: Contract;
}

const TOP_N = 5;

export function SummaryDocument({ contract }: Props) {
  const clauses = contract.clauses ?? [];
  const topHigh = clauses
    .filter((c) => c.riskLevel === "high")
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, TOP_N);

  const subtitle = `Risk Summary · ${contractTypeFullLabel(contract.contractType)} · v${contract.version}`;

  return (
    <Document
      title={`${contract.title} — Risk Summary`}
      author="Clauseium"
      subject="Contract risk summary"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.brandRow}>
          <Text style={styles.brandMark}>CLAUSEIUM</Text>
          <Text style={styles.brandMeta}>{subtitle}</Text>
        </View>

        <Text style={styles.title}>{contract.title}</Text>
        <Text style={styles.subtitle}>
          {contract.counterparty} · Generated {formatLongDate(new Date())}
        </Text>

        <View style={styles.metaGrid}>
          <MetaCell label="Counterparty" value={contract.counterparty} />
          <MetaCell label="Governing law" value={contract.governingLaw} />
          <MetaCell label="Jurisdiction" value={contract.jurisdiction} />
          <MetaCell
            label="Overall score"
            value={`${contract.riskSummary.overallScore} / 100`}
          />
        </View>

        <Text style={styles.sectionHeading}>Risk Distribution</Text>
        <View style={styles.riskRow}>
          <RiskCountCell count={contract.riskSummary.high} label="High" color={colors.riskHigh} />
          <RiskCountCell count={contract.riskSummary.medium} label="Medium" color={colors.riskMed} />
          <RiskCountCell count={contract.riskSummary.low} label="Low" color={colors.riskLow} />
          <RiskCountCell count={contract.riskSummary.standard} label="Standard" color={colors.ink500} />
          <RiskCountCell count={contract.riskSummary.missing} label="Missing" color={colors.riskInfo} />
        </View>

        {contract.riskSummary.escalationRecommended && contract.riskSummary.escalationReason && (
          <View
            style={{
              backgroundColor: colors.paper50,
              padding: 10,
              marginBottom: 14,
            }}
          >
            <Text style={[styles.clauseLabel, { marginTop: 0, color: colors.riskHigh }]}>
              Escalation recommended
            </Text>
            <Text style={styles.clauseSummary}>{contract.riskSummary.escalationReason}</Text>
          </View>
        )}

        <Text style={styles.sectionHeading}>
          Top {Math.min(TOP_N, topHigh.length)} High-Risk Clauses
        </Text>
        {topHigh.length === 0 ? (
          <Text style={styles.clauseSummary}>
            No high-risk clauses detected — see full report for medium and low findings.
          </Text>
        ) : (
          topHigh.map((c) => (
            <View key={c.id} style={styles.clauseCardBordered} wrap={false}>
              <View style={styles.clauseHeader}>
                <Text style={styles.clauseNumber}>§ {c.clauseNumber}</Text>
                <RiskBadge level={c.riskLevel} />
              </View>
              <Text style={styles.clauseTitle}>{c.title}</Text>
              <Text style={styles.clauseSummary}>{c.summary}</Text>
              {c.citations.slice(0, 2).map((cit) => (
                <CitationLine key={cit.id} c={cit} />
              ))}
            </View>
          ))
        )}

        <Text
          style={{
            fontSize: 8,
            color: colors.ink500,
            fontStyle: "italic",
            marginTop: 24,
            paddingTop: 8,
          }}
        >
          {DISCLAIMER_LONG}
        </Text>
      </Page>
    </Document>
  );
}
