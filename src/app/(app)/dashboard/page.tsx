import { Plus } from "lucide-react";
import { ActionBanner } from "@/components/app/action-banner";
import { ActivityFeed } from "@/components/app/activity-feed";
import { AttentionCard, HighRiskCard } from "@/components/app/action-cards";
import { ContractTable } from "@/components/app/contract-table";
import { EmptyState } from "@/components/app/empty-state";
import { contracts } from "@/lib/mock-data";
import { formatLongDate } from "@/lib/format";
import { getDashboardGreeting } from "@/lib/dashboard-greeting";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const today = new Date();
  const { title, subtitle, state } = getDashboardGreeting(user, contracts, today);

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <header>
          <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold text-ink-100 tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Welcome to Clauseium. Let&apos;s get your first contract reviewed.
          </p>
        </header>
        <EmptyState />
      </div>
    );
  }

  // Compute action card stats
  const needsAttention = contracts.filter((c) => c.status === "needs_attention").length;
  const awaitingApproval = contracts.filter((c) => c.status === "reviewed").length;
  const attentionCount = needsAttention + awaitingApproval;
  const attentionHighRisk = contracts.filter(
    (c) => (c.status === "needs_attention" || c.status === "reviewed") && c.riskSummary.high > 0,
  ).length;

  const highRiskContracts = contracts.filter((c) => c.riskSummary.high > 0);
  const totalHighClauses = highRiskContracts.reduce((sum, c) => sum + c.riskSummary.high, 0);

  // First contract that needs the user — for the action banner CTA
  const firstUrgent = [...contracts]
    .sort((a, b) => {
      const order = (s: typeof a.status) => (s === "needs_attention" ? 0 : s === "in_progress" ? 1 : 2);
      return order(a.status) - order(b.status);
    })
    .find((c) => c.status === "needs_attention" || c.status === "in_progress");

  // Estimated review time: 6 min per contract that needs attention (matches landing page claim)
  const estimatedMinutes = Math.max(needsAttention * 6, 6);

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold text-ink-100 tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-ink-500 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-500">{formatLongDate(today)}</p>
          {state === "caught_up" && (
            <button className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors">
              <Plus className="h-4 w-4" />
              Upload a contract
            </button>
          )}
        </div>
      </header>

      {/* Action cards */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <AttentionCard
          stats={{
            needsAttention: attentionCount,
            highRisk: attentionHighRisk,
            awaitingApproval,
          }}
        />
        <HighRiskCard
          stats={{
            totalHighClauses,
            contractCount: highRiskContracts.length,
          }}
          contracts={highRiskContracts}
        />
      </section>

      {/* Action banner — only when something needs the user */}
      {needsAttention > 0 && firstUrgent && (
        <ActionBanner
          count={needsAttention}
          estimatedMinutes={estimatedMinutes}
          firstHref={`/dashboard/contracts/${firstUrgent.id}`}
        />
      )}

      {/* Full-width contract queue */}
      <ContractTable contracts={contracts} />

      {/* Activity strip */}
      <ActivityFeed />
    </div>
  );
}
