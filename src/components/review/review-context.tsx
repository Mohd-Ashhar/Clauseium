"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Info } from "lucide-react";
import type { Contract, RiskLevel } from "@/types/contract";

export type ClauseState = "pending" | "accepted" | "rejected" | "modified";

interface Toast {
  id: number;
  message: string;
  tone: "success" | "info";
}

interface ReviewContextValue {
  contract: Contract;
  activeClauseId: string | null;
  setActiveClauseId: (id: string | null) => void;
  clauseStates: Record<string, ClauseState>;
  setClauseState: (id: string, s: ClauseState) => void;
  filterLevel: RiskLevel | "all";
  setFilterLevel: (l: RiskLevel | "all") => void;
  citationDrawerId: string | null;
  setCitationDrawerId: (id: string | null) => void;
  exportOpen: boolean;
  setExportOpen: (v: boolean) => void;
  toast: (message: string, tone?: "success" | "info") => void;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({
  contract,
  children,
}: {
  contract: Contract;
  children: React.ReactNode;
}) {
  const [activeClauseId, _setActiveClauseId] = useState<string | null>(null);
  const [clauseStates, setClauseStates] = useState<Record<string, ClauseState>>({});
  const [filterLevel, setFilterLevel] = useState<RiskLevel | "all">("all");
  const [citationDrawerId, setCitationDrawerId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const setActiveClauseId = useCallback((id: string | null) => {
    _setActiveClauseId(id);
    if (!id) return;
    // Defer scroll to allow any framer-motion expansion to start.
    requestAnimationFrame(() => {
      const docEl = document.getElementById(`doc-clause-${id}`);
      const cardEl = document.getElementById(`card-clause-${id}`);
      docEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      cardEl?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const setClauseState = useCallback((id: string, s: ClauseState) => {
    setClauseStates((prev) => ({ ...prev, [id]: s }));
  }, []);

  const toast = useCallback((message: string, tone: "success" | "info" = "info") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const value = useMemo<ReviewContextValue>(
    () => ({
      contract,
      activeClauseId,
      setActiveClauseId,
      clauseStates,
      setClauseState,
      filterLevel,
      setFilterLevel,
      citationDrawerId,
      setCitationDrawerId,
      exportOpen,
      setExportOpen,
      toast,
    }),
    [
      contract,
      activeClauseId,
      setActiveClauseId,
      clauseStates,
      setClauseState,
      filterLevel,
      citationDrawerId,
      exportOpen,
      toast,
    ],
  );

  return (
    <ReviewContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} />
    </ReviewContext.Provider>
  );
}

export function useReview() {
  const ctx = useContext(ReviewContext);
  if (!ctx) throw new Error("useReview must be used within ReviewProvider");
  return ctx;
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto bg-ink-800 border border-ink-700 rounded-lg shadow-xl px-4 py-2.5 flex items-center gap-2 max-w-sm"
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-risk-low shrink-0" />
            ) : (
              <Info className="h-4 w-4 text-risk-info shrink-0" />
            )}
            <span className="text-[13px] text-ink-100">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
