"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Settings, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SignOutMenuItem } from "@/components/auth/sign-out-menu-item";
import type { User } from "@/types/contract";
import { useSidebar } from "./sidebar-context";
import { primaryNav, settingsNav, type NavItem } from "./sidebar-nav";

function NavRow({ item, collapsed, active }: { item: NavItem; collapsed: boolean; active: boolean }) {
  const Icon = item.icon;
  const baseRow = cn(
    "group relative flex items-center gap-3 h-10 px-3 mx-2 text-sm transition-colors",
    collapsed && "justify-center px-0 mx-2",
  );
  const interactiveRow = active
    ? "bg-counsel-500/10 text-counsel-200 rounded-r-lg border-l-2 border-counsel-500"
    : "text-ink-300 hover:bg-ink-850 hover:text-ink-100 rounded-lg";
  const disabledRow = "text-ink-500 cursor-not-allowed rounded-lg opacity-70";

  const inner = (
    <>
      <Icon
        className={cn(
          "shrink-0 h-4 w-4",
          item.disabled
            ? "text-ink-600"
            : active
              ? "text-counsel-400"
              : "text-ink-500 group-hover:text-ink-300",
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1 truncate font-normal">{item.label}</span>
          {item.disabled ? (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-ink-800 text-ink-500">
              Soon
            </span>
          ) : (
            item.badge && (
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                  item.badgeTone === "attention"
                    ? "bg-risk-med/15 text-risk-med"
                    : "bg-ink-700 text-ink-200",
                )}
              >
                {item.badge}
              </span>
            )
          )}
        </>
      )}
    </>
  );

  if (item.disabled) {
    return (
      <div
        className={cn(baseRow, disabledRow)}
        title={collapsed ? `${item.label} (coming soon)` : "Coming soon"}
        aria-disabled="true"
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(baseRow, interactiveRow)}
      title={collapsed ? item.label : undefined}
    >
      {inner}
    </Link>
  );
}

export function AppSidebar({ user }: { user: User }) {
  const pathname = usePathname() ?? "";
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const [profileOpen, setProfileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col bg-ink-900 border-r border-ink-700 transition-[width,transform] duration-300 ease-out",
          collapsed ? "w-16" : "w-[260px]",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Workspace header */}
        <div
          className={cn(
            "h-14 flex items-center border-b border-ink-700 shrink-0",
            collapsed ? "justify-center px-0" : "px-5",
          )}
        >
          {collapsed ? (
            <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-counsel-400 leading-none">
              §
            </span>
          ) : (
            <div className="flex flex-col leading-tight">
              <span className="font-[family-name:var(--font-display)] text-base font-bold text-ink-100">
                <span className="text-counsel-400">§</span> Clauseium
              </span>
              <span className="text-[11px] text-ink-500 mt-0.5">Clauseium Legal</span>
            </div>
          )}
        </div>

        {/* Flat nav */}
        <nav className="flex-1 overflow-y-auto py-4 dark-scrollbar">
          <div className="space-y-1">
            {primaryNav.map((item) => (
              <NavRow
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={isActive(item.href)}
              />
            ))}
          </div>

          <div className="my-3 mx-3 border-t border-ink-700/50" />

          <div className="space-y-1">
            <NavRow
              item={settingsNav}
              collapsed={collapsed}
              active={isActive(settingsNav.href)}
            />
          </div>
        </nav>

        {/* Footer: profile + collapse trigger */}
        <div className="border-t border-ink-700 p-3 shrink-0">
          <div className={cn("relative flex items-center gap-2", collapsed && "flex-col")}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2.5 flex-1 rounded-lg p-1.5 text-left hover:bg-ink-850 transition-colors min-w-0",
                collapsed && "flex-col gap-1 p-1 w-full",
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0",
                  user.avatarColor,
                )}
              >
                {user.initials}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-ink-100 font-medium leading-tight truncate">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-ink-500 truncate">{user.email}</div>
                </div>
              )}
            </button>

            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded text-ink-500 hover:text-ink-100 hover:bg-ink-850 transition-colors"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft className={cn("h-4 w-4", collapsed && "rotate-180")} />
            </button>

            {profileOpen && !collapsed && (
              <div
                className="absolute bottom-full left-0 right-0 mb-2 bg-ink-800 border border-ink-700 rounded-lg shadow-xl py-1 z-10"
                onMouseLeave={() => setProfileOpen(false)}
              >
                <button className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-ink-300 hover:bg-ink-850 hover:text-ink-100">
                  <UserIcon className="h-3.5 w-3.5" /> Profile
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-ink-300 hover:bg-ink-850 hover:text-ink-100">
                  <Settings className="h-3.5 w-3.5" /> Preferences
                </button>
                <div className="my-1 border-t border-ink-700" />
                <SignOutMenuItem />
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
