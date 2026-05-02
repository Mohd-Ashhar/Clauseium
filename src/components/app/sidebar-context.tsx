"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface SidebarContextValue {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleCollapsed: () => void;
  setMobileOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore persisted preference on mount.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("clauseium.sidebar.collapsed") : null;
    if (stored === "1") setCollapsed(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("clauseium.sidebar.collapsed", next ? "1" : "0");
      } catch {
        // ignore storage errors (private mode, etc.)
      }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider value={{ collapsed, mobileOpen, toggleCollapsed, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
