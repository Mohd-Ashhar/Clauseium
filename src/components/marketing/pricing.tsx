"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { FadeUp } from "@/components/motion/fade-up";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Cycle = "annual" | "monthly";

type Tier = {
  name: string;
  pitch: string;
  monthly: number | "custom";
  annual: number | "custom";
  features: string[];
  highlighted?: boolean;
  cta: string;
};

const tiers: Tier[] = [
  {
    name: "Counsel",
    pitch: "For solo GCs and small in-house teams.",
    monthly: 3749,
    annual: 2999,
    features: [
      "Up to 3 seats",
      "50 contract reviews / month",
      "AI clause drafting",
      "DPDP compliance check",
      "Indian law citations",
      "Word add-in",
      "Email support",
      "Standard playbook templates",
    ],
    cta: "Start free trial",
  },
  {
    name: "Chambers",
    pitch: "For in-house teams of 4–25.",
    monthly: 6249,
    annual: 4999,
    highlighted: true,
    features: [
      "Everything in Counsel",
      "Unlimited reviews",
      "Custom playbook engine",
      "Clause benchmarking",
      "Priority support",
      "Team collaboration",
      "API access",
      "SSO",
    ],
    cta: "Start free trial",
  },
  {
    name: "Enterprise",
    pitch: "For large corporates and MNCs.",
    monthly: "custom",
    annual: "custom",
    features: [
      "Everything in Chambers",
      "Unlimited seats",
      "Private deployment",
      "Dedicated CSM",
      "Custom integrations",
      "SLA guarantee",
      "Audit compliance reports",
      "On-premise option",
    ],
    cta: "Talk to sales",
  },
];

export function Pricing() {
  const [cycle, setCycle] = useState<Cycle>("annual");

  return (
    <section id="pricing" className="bg-paper-50 py-20 md:py-28">
      <div className="mx-auto max-w-[1240px] px-6">
        <FadeUp>
          <p className="text-center text-[11px] uppercase tracking-[0.18em] text-counsel-600">
            Pricing
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-center font-display text-[clamp(1.75rem,2vw+0.5rem,2.4rem)] font-bold tracking-[-0.02em] text-paper-900">
            Transparent pricing. No per-contract fees.
          </h2>

          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-full border border-paper-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setCycle("monthly")}
                aria-pressed={cycle === "monthly"}
                className={cn(
                  "rounded-full px-4 py-2 text-[13px] font-medium transition-all",
                  cycle === "monthly"
                    ? "bg-paper-900 text-white"
                    : "text-paper-900/60 hover:text-paper-900",
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setCycle("annual")}
                aria-pressed={cycle === "annual"}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all",
                  cycle === "annual"
                    ? "bg-paper-900 text-white"
                    : "text-paper-900/60 hover:text-paper-900",
                )}
              >
                Annual
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    cycle === "annual"
                      ? "bg-counsel-500/30 text-counsel-200"
                      : "bg-counsel-500/10 text-counsel-600",
                  )}
                >
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </FadeUp>

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          {tiers.map((t, i) => (
            <FadeUp key={t.name} delay={i * 0.07}>
              <PricingCard tier={t} cycle={cycle} />
            </FadeUp>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-[13.5px] text-paper-900/50">
          All plans include Indian law corpus updates, DPDP-grade security, and
          14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  );
}

function PricingCard({ tier, cycle }: { tier: Tier; cycle: Cycle }) {
  const price = cycle === "annual" ? tier.annual : tier.monthly;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-white p-7 transition-all",
        tier.highlighted
          ? "border-2 border-counsel-500 shadow-[0_0_0_1px_rgba(201,164,73,0.18),0_24px_60px_-20px_rgba(201,164,73,0.45)]"
          : "border-paper-200",
      )}
    >
      {tier.highlighted && (
        <span className="absolute right-6 top-0 -translate-y-1/2 rounded-full bg-counsel-500 px-3 py-1 text-[11px] font-semibold text-white">
          Most Popular
        </span>
      )}

      <div className="text-[13px] uppercase tracking-[0.16em] text-paper-900/40">
        Tier
      </div>
      <h3 className="mt-1 font-display text-[20px] font-semibold tracking-tight text-paper-900">
        {tier.name}
      </h3>
      <p className="mt-1 text-[13.5px] text-paper-900/55">{tier.pitch}</p>

      <div className="mt-6 flex items-baseline gap-1.5">
        {price === "custom" ? (
          <span className="font-display text-[36px] font-bold text-paper-900">
            Custom
          </span>
        ) : (
          <>
            <span className="font-display text-[36px] font-bold text-paper-900">
              ₹{price.toLocaleString("en-IN")}
            </span>
            <span className="text-[13px] text-paper-900/55">
              /user/month
            </span>
          </>
        )}
      </div>
      {price !== "custom" && (
        <p className="mt-0.5 text-[11.5px] text-paper-900/40">
          billed {cycle}
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-2.5">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-paper-900/80">
            <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-counsel-500/10 text-counsel-600">
              <Check className="h-3 w-3" />
            </span>
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <Button
          variant={tier.highlighted ? "primary" : "outline"}
          size="md"
          className="w-full"
        >
          {tier.cta}
        </Button>
      </div>
    </div>
  );
}
