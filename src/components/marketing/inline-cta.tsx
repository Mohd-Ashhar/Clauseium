import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeUp } from "@/components/motion/fade-up";

type Variant = "outline" | "primary";

export function InlineCTA({
  caption,
  label,
  href = "#cta",
  variant = "outline",
}: {
  caption: string;
  label: string;
  href?: string;
  variant?: Variant;
}) {
  return (
    <FadeUp>
      <div className="bg-paper-50 px-6 py-10 text-center">
        <p className="text-[13.5px] text-paper-900/55">{caption}</p>
        <div className="mt-3">
          <Button
            asChild
            size="md"
            variant={variant === "primary" ? "primary" : "outline"}
            className={
              variant === "outline"
                ? "border-brand-500/30 bg-white text-brand-600 hover:border-brand-500/60 hover:bg-brand-500/5"
                : ""
            }
          >
            <Link href={href}>
              {label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </FadeUp>
  );
}
