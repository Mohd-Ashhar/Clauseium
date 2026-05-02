import {
  LayoutDashboard,
  FileText,
  FileSearch,
  FileStack,
  FilePen,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeTone?: "neutral" | "attention";
}

// Flat list — no groups. Settings is rendered separately below a divider.
export const primaryNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Contracts", href: "/dashboard/contracts", icon: FileText },
  {
    label: "Reviews",
    href: "/dashboard/reviews",
    icon: FileSearch,
    badge: "4",
    badgeTone: "attention",
  },
  { label: "Templates", href: "/dashboard/templates", icon: FileStack },
  { label: "Drafts", href: "/dashboard/drafts", icon: FilePen },
];

export const settingsNav: NavItem = {
  label: "Settings",
  href: "/dashboard/settings",
  icon: Settings,
};
