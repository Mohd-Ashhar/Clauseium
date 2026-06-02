"use client";

import { useState } from "react";
import { CheckCircle2, Download, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TemplateDownloadCTAProps {
  templateId?: string;
  heading?: string;
  body?: string;
  contentSlug: string;
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; downloadUrl?: string }
  | { status: "error"; message: string };

export function TemplateDownloadCTA({
  templateId,
  heading = "Download this template",
  body = "Free. Indian-law compliant. Reviewed by a Bar Council advocate.",
  contentSlug,
}: TemplateDownloadCTAProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          contentSlug,
          templateId,
          source: "template_download",
        }),
      });
      const data = (await res.json()) as { downloadUrl?: string; error?: string };
      if (!res.ok) {
        setState({
          status: "error",
          message: data.error ?? "Something went wrong. Please try again.",
        });
        return;
      }
      setState({ status: "success", downloadUrl: data.downloadUrl });
    } catch {
      setState({
        status: "error",
        message: "Network error. Please try again.",
      });
    }
  }

  return (
    <aside className="my-10 rounded-2xl border border-counsel-200 bg-counsel-50 p-6 md:p-8">
      <div className="flex items-start gap-4">
        <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-counsel-500 text-white sm:inline-flex">
          <FileDown className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h3 className="font-display text-[19px] font-semibold text-paper-900">
            {heading}
          </h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-paper-700">
            {body}
          </p>

          {state.status === "success" ? (
            <div className="mt-5 rounded-xl border border-counsel-200 bg-white p-4">
              <div className="flex items-center gap-2 text-[14px] font-medium text-paper-900">
                <CheckCircle2 className="h-4 w-4 text-counsel-600" />
                Your template is ready.
              </div>
              {state.downloadUrl ? (
                <Button
                  asChild
                  variant="primary"
                  size="md"
                  className="mt-3 w-full sm:w-auto"
                >
                  <a href={state.downloadUrl} download>
                    <Download className="mr-1.5 h-4 w-4" />
                    Download template
                  </a>
                </Button>
              ) : (
                <p className="mt-2 text-[13px] text-paper-600">
                  We&apos;ve sent a download link to <strong>{email}</strong>.
                  Check your inbox.
                </p>
              )}
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <Input
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 border-paper-200 bg-white text-paper-900 placeholder:text-paper-500"
                disabled={state.status === "loading"}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={state.status === "loading"}
              >
                {state.status === "loading" ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Download free template"
                )}
              </Button>
            </form>
          )}

          {state.status === "error" && (
            <p className="mt-3 text-[13px] text-risk-high">{state.message}</p>
          )}

          <p className="mt-3 text-[12px] text-paper-500">
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </aside>
  );
}
