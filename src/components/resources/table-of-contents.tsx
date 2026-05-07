"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Heading } from "@/lib/content";
import { cn } from "@/lib/utils";

export function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          visible.sort(
            (a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top,
          );
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-100px 0px -70% 0px", threshold: 0 },
    );
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => !!el);
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (!headings.length) return null;

  return (
    <>
      <div className="mb-6 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-paper-200 bg-white px-4 py-3 text-left text-[14px] font-medium text-paper-900"
          aria-expanded={mobileOpen}
        >
          <span>On this page</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              mobileOpen && "rotate-180",
            )}
          />
        </button>
        {mobileOpen && (
          <ul className="mt-2 space-y-1 rounded-xl border border-paper-200 bg-white p-3">
            {headings.map((h) => (
              <TOCItem
                key={h.id}
                heading={h}
                active={activeId === h.id}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </ul>
        )}
      </div>

      <nav aria-label="On this page" className="hidden lg:block">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper-500">
          On this page
        </div>
        <ul className="mt-4 space-y-1.5 border-l border-paper-200">
          {headings.map((h) => (
            <TOCItem key={h.id} heading={h} active={activeId === h.id} />
          ))}
        </ul>
      </nav>
    </>
  );
}

function TOCItem({
  heading,
  active,
  onClick,
}: {
  heading: Heading;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <li>
      <a
        href={`#${heading.id}`}
        onClick={onClick}
        className={cn(
          "block border-l-2 py-1 pl-4 text-[13.5px] leading-snug transition-colors -ml-px",
          heading.depth === 3 && "pl-7",
          active
            ? "border-brand-500 text-paper-900"
            : "border-transparent text-paper-600 hover:border-paper-300 hover:text-paper-900",
        )}
      >
        {heading.text}
      </a>
    </li>
  );
}
