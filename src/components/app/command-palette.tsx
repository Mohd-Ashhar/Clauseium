"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadDialog } from "./upload-dialog";

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  keywords?: string;
  run: () => void;
}

const Ctx = createContext<{ open: () => void }>({ open: () => {} });
export function useCommandPalette() {
  return useContext(Ctx);
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);

  // Global ⌘K / Ctrl+K toggles the palette from anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {isOpen && <Palette onClose={() => setIsOpen(false)} />}
    </Ctx.Provider>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { open: openUpload } = useUploadDialog();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      onClose();
      router.push(href);
    };
    return [
      {
        id: "new",
        label: "Upload a contract",
        hint: "New review",
        icon: Plus,
        keywords: "add upload new contract review",
        run: () => {
          onClose();
          openUpload();
        },
      },
      {
        id: "dashboard",
        label: "Go to Dashboard",
        icon: LayoutDashboard,
        keywords: "home contracts overview",
        run: go("/dashboard"),
      },
      {
        id: "settings",
        label: "Settings",
        hint: "Account · data & retention",
        icon: Settings,
        keywords: "account dpdp retention privacy delete",
        run: go("/dashboard/settings"),
      },
      {
        id: "security",
        label: "Security & data protection",
        icon: ShieldCheck,
        keywords: "dpdp zdr soc2 iso encryption trust",
        run: go("/security"),
      },
    ];
  }, [router, onClose, openUpload]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.keywords ?? "").toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Keep the active index in range as results change.
  useEffect(() => {
    setActive(0);
  }, [query]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[active]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-ink-950/70 backdrop-blur-sm p-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-ink-700 bg-ink-850 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-ink-700 px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search actions and pages…"
            className="flex-1 bg-transparent py-3.5 text-sm text-ink-100 placeholder:text-ink-500 focus:outline-none"
          />
          <kbd className="hidden sm:block rounded border border-ink-700 bg-ink-900 px-1.5 py-0.5 text-[10px] font-[family-name:var(--font-mono)] text-ink-500">
            esc
          </kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto dark-scrollbar py-1.5">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-[13px] text-ink-500">
              No matches
            </li>
          )}
          {results.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={c.run}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  i === active ? "bg-counsel-500/10" : "hover:bg-ink-800/60",
                )}
              >
                <c.icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    i === active ? "text-counsel-400" : "text-ink-500",
                  )}
                />
                <span className="flex-1 text-[13.5px] text-ink-100">{c.label}</span>
                {c.hint && (
                  <span className="text-[11.5px] text-ink-500">{c.hint}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
