import Link from "next/link";
import {
  ArrowRight,
  Cloud,
  Database,
  FileLock2,
  Lock,
  ScrollText,
  Users,
} from "lucide-react";
import { FadeUp } from "@/components/motion/fade-up";

// Honest posture: lead with the architectural facts we actually control today.
// Formal certifications (SOC 2 / ISO) are surfaced as "in progress" on /security
// rather than displayed as earned badges.
const badges = [
  { icon: Database, label: "Zero data retention" },
  { icon: FileLock2, label: "DPDP-aligned retention" },
  { icon: Cloud, label: "AWS Mumbai residency" },
  { icon: Lock, label: "256-bit encryption" },
  { icon: Users, label: "Tenant isolation" },
  { icon: ScrollText, label: "Complete audit trail" },
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
                <Icon className="h-3.5 w-3.5 text-counsel-600" />
                {label}
              </span>
            ))}
          </div>
          <p className="mt-7 text-center text-[12.5px] text-paper-900/45">
            Your contracts never train foundation models. SOC 2 Type II and
            ISO 27001 are in progress.{" "}
            <Link
              href="/security"
              className="inline-flex items-center gap-1 font-medium text-counsel-600 hover:text-counsel-500"
            >
              See our security
              <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
        </div>
      </FadeUp>
    </section>
  );
}
