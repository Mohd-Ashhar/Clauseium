import type { LucideIcon } from "lucide-react";
import {
  CheckCheck,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  Send,
} from "lucide-react";
import type { ContractType, ReviewStatus, RiskLevel } from "@/types/contract";

// Indian number formatting: 1,00,000 not 100,000
export function formatIndianNumber(num: number): string {
  const numStr = Math.round(num).toString();
  if (numStr.length <= 3) return numStr;
  const lastThree = numStr.slice(-3);
  const rest = numStr.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
}

export function timeAgo(date: Date): string {
  const now = Date.now();
  const ms = now - date.getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function riskColor(level: RiskLevel): string {
  switch (level) {
    case "high":
      return "risk-high";
    case "medium":
      return "risk-med";
    case "low":
    case "standard":
      return "risk-low";
    case "missing":
      return "risk-info";
  }
}

const contractTypeLabels: Record<ContractType, string> = {
  nda: "NDA",
  msa: "MSA",
  sow: "SOW",
  saas_agreement: "SaaS",
  employment: "Employment",
  vendor_agreement: "Vendor",
  consulting: "Consulting",
  partnership: "Partnership",
  license: "License",
};

export function contractTypeLabel(type: ContractType): string {
  return contractTypeLabels[type];
}

const contractTypeFullLabels: Record<ContractType, string> = {
  nda: "Non-disclosure",
  msa: "Master Services Agreement",
  sow: "Statement of Work",
  saas_agreement: "SaaS Agreement",
  employment: "Employment",
  vendor_agreement: "Vendor Agreement",
  consulting: "Consulting Agreement",
  partnership: "Partnership Agreement",
  license: "License Agreement",
};

export function contractTypeFullLabel(type: ContractType): string {
  return contractTypeFullLabels[type];
}

export interface StatusConfig {
  label: string;
  classes: string; // bg + text combined
  icon: LucideIcon;
  spin?: boolean;
}

// Strict 4-state palette per Dashboard V2 spec.
// "approved" and "sent_back" share neutral tone (kept for activity feed / detail views).
export function statusConfig(status: ReviewStatus): StatusConfig {
  switch (status) {
    case "pending":
      return { label: "Pending", classes: "bg-ink-700/50 text-ink-400", icon: Clock };
    case "in_progress":
      return {
        label: "In progress",
        classes: "bg-risk-info/15 text-risk-info",
        icon: Loader2,
        spin: true,
      };
    case "reviewed":
      return { label: "Reviewed", classes: "bg-risk-low/15 text-risk-low", icon: CheckCircle2 };
    case "needs_attention":
      return { label: "Needs you", classes: "bg-risk-med/15 text-risk-med", icon: AlertTriangle };
    case "approved":
      return { label: "Approved", classes: "bg-risk-low/15 text-risk-low", icon: CheckCheck };
    case "sent_back":
      return { label: "Sent back", classes: "bg-ink-700/50 text-ink-400", icon: Send };
  }
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
