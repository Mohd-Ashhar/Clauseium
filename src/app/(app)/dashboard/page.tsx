import { ActionBanner } from "@/components/app/action-banner";
import { AttentionCard, HighRiskCard } from "@/components/app/action-cards";
import { ContractTable } from "@/components/app/contract-table";
import { EmptyState } from "@/components/app/empty-state";
import { UploadButton } from "@/components/app/upload-button";
import { formatLongDate } from "@/lib/format";
import { getDashboardGreeting } from "@/lib/dashboard-greeting";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { loadDashboard } from "@/lib/dashboard-data";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = new Date();
  const { contracts, stats } = await loadDashboard();
  const { title, subtitle, state } = getDashboardGreeting(user, stats, today);

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

  const firstUrgent = contracts.find((c) => c.status === "needs_attention");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[24px] font-semibold text-ink-100 tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-ink-500 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-500">{formatLongDate(today)}</p>
          {state === "caught_up" && <UploadButton />}
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <AttentionCard
          stats={{
            needsAttention: stats.needsAttention,
            highRisk: stats.highRisk,
          }}
        />
        <HighRiskCard
          stats={{
            totalHighClauses: stats.totalHighClauses,
            contractCount: stats.highRisk,
          }}
        />
      </section>

      {firstUrgent && (
        <ActionBanner
          count={stats.needsAttention}
          firstHref={`/dashboard/uploads/${firstUrgent.id}`}
        />
      )}

      <ContractTable contracts={contracts} />
    </div>
  );
}
