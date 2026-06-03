import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
};

/**
 * Marketing section header: Inter small-caps eyebrow (NOT mono — mono is reserved
 * for clause IDs/citations) + editorial-serif title at font-medium (avoids the
 * heavy faux-bold look). One place to keep every section's voice consistent.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeadingProps) {
  const alignment = align === "center" ? "text-center items-center" : "text-left items-start";
  return (
    <div className={cn("flex flex-col", alignment, className)}>
      {eyebrow && (
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-counsel-600">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 font-display text-[clamp(1.75rem,2vw+0.5rem,2.4rem)] font-medium tracking-[-0.01em] text-paper-900">
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-3 max-w-2xl text-[15px] leading-relaxed text-paper-900/60",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
