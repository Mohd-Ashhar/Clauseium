"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Compare", href: "/compare" },
  { label: "Resources", href: "/resources" },
];

export function Navbar({ forceLight = false }: { forceLight?: boolean }) {
  const pathname = usePathname();
  const lightByRoute =
    forceLight ||
    pathname?.startsWith("/resources") ||
    pathname?.startsWith("/compare") ||
    pathname?.startsWith("/features") ||
    pathname?.startsWith("/pricing") ||
    pathname?.startsWith("/security") ||
    false;
  const [scrolled, setScrolled] = useState(lightByRoute);

  useEffect(() => {
    if (lightByRoute) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.85);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lightByRoute]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-paper-200/80 bg-white/80 backdrop-blur-xl"
          : "border-b border-ink-700/50 bg-ink-900/50 backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-6">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 font-display text-[20px] font-bold tracking-tight transition-colors",
            scrolled ? "text-paper-900" : "text-white",
          )}
        >
          <span className="text-brand-500">§</span>
          <span>Clauseium</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={cn(
                "text-sm font-medium transition-colors",
                scrolled
                  ? "text-paper-900/70 hover:text-paper-900"
                  : "text-ink-300 hover:text-white",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className={cn(
              "text-sm font-medium transition-colors",
              scrolled
                ? "text-paper-900/70 hover:text-paper-900"
                : "text-ink-300 hover:text-white",
            )}
          >
            Sign in
          </Link>
          <Button size="sm" variant="primary" asChild>
            <Link href="/signup">Start free trial</Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <button
              aria-label="Open menu"
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-lg md:hidden",
                scrolled ? "text-paper-900" : "text-white",
              )}
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent>
            <SheetTitle>Menu</SheetTitle>
            <nav className="mt-8 flex flex-col gap-1">
              {links.map((l) => (
                <SheetClose asChild key={l.label}>
                  <Link
                    href={l.href}
                    className="rounded-md px-3 py-3 text-base font-medium text-ink-300 transition hover:bg-ink-800 hover:text-white"
                  >
                    {l.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3 border-t border-ink-700 pt-6">
              <SheetClose asChild>
                <Link
                  href="/login"
                  className="text-sm font-medium text-ink-300 hover:text-white"
                >
                  Sign in
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild variant="primary" size="md" className="w-full">
                  <Link href="/signup">Start free trial</Link>
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
