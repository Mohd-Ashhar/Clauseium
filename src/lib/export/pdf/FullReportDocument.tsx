import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { ClauseAnalysis, Contract } from "@/types/contract";
import type { ClauseState } from "@/components/review/review-context";
import { contractTypeFullLabel, formatLongDate } from "@/lib/format";
import { colors } from "../shared/branding";
import { clauseStateLabel } from "../shared/decisions";
import { DISCLAIMER_LONG } from "../shared/disclaimer";
import {
  CitationLine,
  MetaCell,
  RiskBadge,
  RiskCountCell,
} from "./components";
import { styles } from "./styles";

interface Props {
  contract: Contract;
  clauseStates: Record<string, ClauseState>;
  includeReasoning: boolean;
}

export function FullReportDocument({ contract, clauseStates, includeReasoning }: Props) {
  const clauses = contract.clauses ?? [];
  const subtitle = `Full Analysis · ${contractTypeFullLabel(contract.contractType)} · v${contract.version}`;

  return (
    <Document
      title={`${contract.title} — Full Analysis`}
      author="Clauseium"
      subject="Detailed contract review"
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
          <MetaCell label="Total clauses" value={String(contract.totalClauses)} />
        </View>

        <Text style={styles.sectionHeading}>Risk Distribution</Text>
        <View style={styles.riskRow}>
          <RiskCountCell count={contract.riskSummary.high} label="High" color={colors.riskHigh} />
          <RiskCountCell count={contract.riskSummary.medium} label="Medium" color={colors.riskMed} />
          <RiskCountCell count={contract.riskSummary.low} label="Low" color={colors.riskLow} />
          <RiskCountCell count={contract.riskSummary.standard} label="Standard" color={colors.ink500} />
          <RiskCountCell count={contract.riskSummary.missing} label="Missing" color={colors.riskInfo} />
        </View>

        <Text style={styles.sectionHeading}>Clause-by-Clause Analysis</Text>
        {clauses.map((c) => (
          <ClauseEntry
            key={c.id}
            clause={c}
            state={clauseStates[c.id]}
            includeReasoning={includeReasoning}
          />
        ))}

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

function ClauseEntry({
  clause,
  state,
  includeReasoning,
}: {
  clause: ClauseAnalysis;
  state: ClauseState | undefined;
  includeReasoning: boolean;
}) {
  return (
    <View style={styles.clauseCard}>
      <View style={styles.clauseHeader}>
        <Text style={styles.clauseNumber}>
          § {clause.clauseNumber} · {clauseStateLabel(state)}
        </Text>
        <RiskBadge level={clause.riskLevel} />
      </View>
      <Text style={styles.clauseTitle}>{clause.title}</Text>
      <Text style={styles.clauseSummary}>{clause.summary}</Text>

      <Text style={styles.clauseLabel}>Original</Text>
      <Text style={styles.clauseBodyText}>{clause.originalText}</Text>

      {clause.suggestedRedline && (
        <>
          <Text style={[styles.clauseLabel, { color: colors.brand500 }]}>Suggested redline</Text>
          <Text style={styles.clauseBodyText}>{clause.suggestedRedline}</Text>
        </>
      )}

      {includeReasoning && clause.reasoning && (
        <>
          <Text style={styles.clauseLabel}>AI reasoning</Text>
          <Text style={styles.clauseBodyText}>{clause.reasoning}</Text>
        </>
      )}

      {clause.citations.length > 0 && (
        <>
          <Text style={styles.clauseLabel}>Citations</Text>
          {clause.citations.map((cit) => (
            <CitationLine key={cit.id} c={cit} />
          ))}
        </>
      )}
    </View>
  );
}
