import { FadeUp } from "@/components/motion/fade-up";
import {
  Award,
  Cloud,
  Database,
  Lock,
  Scale,
  Shield,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

const badges = [
  { icon: Shield, label: "SOC 2 Type II" },
  { icon: ShieldCheck, label: "ISO 27001" },
  { icon: Award, label: "ISO 42001" },
  { icon: CheckCircle2, label: "DPDP Ready" },
  { icon: Database, label: "Zero Data Retention" },
  { icon: Cloud, label: "AWS Mumbai" },
  { icon: Scale, label: "Bar Council Aligned" },
  { icon: Lock, label: "256-bit Encryption" },
];

export function TrustBadges() {
  return (
    <section className="bg-paper-100 py-14">
      <FadeUp>
        <div className="mx-auto max-w-[1240px] px-6">
          <p className="text-center text-[14px] font-medium text-paper-900/60">
            Enterprise-grade security. Indian-law-grade precision.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            {badges.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-lg border border-paper-200 bg-white px-3.5 py-2 text-[12px] font-medium text-paper-900/75"
              >
                <Icon className="h-3.5 w-3.5 text-paper-900/45" />
                {label}
              </span>
            ))}
          </div>
          <p className="mt-7 text-center text-[12.5px] text-paper-900/40">
            Your contracts never train foundation models. Complete audit trail
            on every action.
          </p>
        </div>
      </FadeUp>
    </section>
  );
}
