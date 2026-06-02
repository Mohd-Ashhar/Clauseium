"use client";

import { useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterSignup({ contentSlug }: { contentSlug?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          contentSlug,
          source: "newsletter",
        }),
      });
      if (res.ok) setStatus("success");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-paper-200 bg-paper-50 p-5">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-counsel-600">
        <Mail className="h-3.5 w-3.5" />
        Stay updated
      </div>
      <h4 className="mt-2 font-display text-[15.5px] font-semibold leading-snug text-paper-900">
        Indian legal updates, weekly.
      </h4>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-paper-600">
        DPDP rulings, contract precedents, and template updates. No spam.
      </p>

      {status === "success" ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-counsel-200 bg-white p-3 text-[13px] text-paper-900">
          <CheckCircle2 className="h-4 w-4 text-counsel-600" />
          You&apos;re subscribed.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 space-y-2">
          <Input
            type="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-paper-200 bg-white text-paper-900 placeholder:text-paper-500"
            disabled={status === "loading"}
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Subscribing…" : "Subscribe"}
          </Button>
        </form>
      )}

      {status === "error" && (
        <p className="mt-2 text-[12px] text-risk-high">
          Couldn&apos;t subscribe. Please try again.
        </p>
      )}
    </div>
  );
}
