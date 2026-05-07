import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbTrail {
  label: string;
  href?: string;
}

export function Breadcrumbs({
  trail,
  variant = "dark",
}: {
  trail: BreadcrumbTrail[];
  variant?: "dark" | "light";
}) {
  const linkClass =
    variant === "dark"
      ? "text-ink-300/80 hover:text-white"
      : "text-paper-600 hover:text-paper-900";
  const sepClass =
    variant === "dark" ? "text-ink-500" : "text-paper-400";
  const currentClass =
    variant === "dark" ? "text-white" : "text-paper-900";

  return (
    <nav aria-label="Breadcrumb" className="text-[13px]">
      <ol className="flex flex-wrap items-center gap-1.5">
        {trail.map((crumb, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
              {crumb.href && !isLast ? (
                <Link href={crumb.href} className={`transition-colors ${linkClass}`}>
                  {crumb.label}
                </Link>
              ) : (
                <span className={isLast ? currentClass : linkClass}>
                  {crumb.label}
                </span>
              )}
              {!isLast && <ChevronRight className={`h-3.5 w-3.5 ${sepClass}`} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
