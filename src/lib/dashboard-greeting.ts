import type { Contract, User } from "@/types/contract";
import { greeting as timeGreeting } from "./format";

export interface DashboardGreeting {
  title: string;
  subtitle: string;
  state: "needs_attention" | "in_progress" | "caught_up";
}

export function getDashboardGreeting(
  user: User,
  contracts: Contract[],
  now: Date = new Date(),
): DashboardGreeting {
  const first = user.name.split(" ")[0];
  const title = `${timeGreeting(now)}, ${first}`;

  const needsAttention = contracts.filter((c) => c.status === "needs_attention").length;
  const highRisk = contracts.filter((c) => c.riskSummary.high > 0).length;
  const inProgress = contracts.filter((c) => c.status === "in_progress").length;

  if (needsAttention > 0) {
    const noun = needsAttention === 1 ? "contract" : "contracts";
    const verb = needsAttention === 1 ? "needs" : "need";
    const tail = highRisk > 0 ? ` ${highRisk} with high-risk clauses.` : "";
    return {
      title,
      subtitle: `${needsAttention} ${noun} ${verb} your review.${tail}`,
      state: "needs_attention",
    };
  }

  if (inProgress > 0) {
    const tail =
      inProgress === 1
        ? "1 contract is being analyzed. We'll notify you when ready."
        : `${inProgress} contracts are being analyzed. We'll notify you when ready.`;
    return { title, subtitle: tail, state: "in_progress" };
  }

  return {
    title,
    subtitle: "You're all caught up. Upload a new contract to get started.",
    state: "caught_up",
  };
}
