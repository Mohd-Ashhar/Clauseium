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
  // Routes that aren't implemented yet. Disabled items render as
  // non-interactive rows with a "Soon" tag so Next.js doesn't prefetch
  // them (which previously produced 404s in the console).
  disabled?: boolean;
}

// Flat list — no groups. Settings is rendered separately below a divider.
export const primaryNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Contracts",
    href: "/dashboard/contracts",
    icon: FileText,
    disabled: true,
  },
  {
    label: "Reviews",
    href: "/dashboard/reviews",
    icon: FileSearch,
    badge: "4",
    badgeTone: "attention",
    disabled: true,
  },
  {
    label: "Templates",
    href: "/dashboard/templates",
    icon: FileStack,
    disabled: true,
  },
  {
    label: "Drafts",
    href: "/dashboard/drafts",
    icon: FilePen,
    disabled: true,
  },
];

export const settingsNav: NavItem = {
  label: "Settings",
  href: "/dashboard/settings",
  icon: Settings,
  disabled: true,
};
