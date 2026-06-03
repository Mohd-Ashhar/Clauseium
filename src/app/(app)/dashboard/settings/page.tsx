import Link from "next/link";
import { redirect } from "next/navigation";
import { Database, FileLock2, ShieldCheck, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-[24px] font-medium tracking-tight text-ink-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Your account and how Clauseium handles your data.
        </p>
      </header>

      <Card padding="md">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-ink-500">
          Account
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[12px] text-ink-500">Name</dt>
            <dd className="mt-0.5 text-[14px] text-ink-100">{user.name}</dd>
          </div>
          <div>
            <dt className="text-[12px] text-ink-500">Email</dt>
            <dd className="mt-0.5 text-[14px] text-ink-100">{user.email}</dd>
          </div>
        </dl>
      </Card>

      <Card padding="md">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-ink-500">
          Data &amp; retention
        </h2>
        <ul className="mt-4 space-y-4">
          <li className="flex items-start gap-3">
            <FileLock2 className="mt-0.5 h-4 w-4 shrink-0 text-counsel-500" />
            <div>
              <p className="text-[14px] font-medium text-ink-100">
                30-day retention by default
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-400">
                Uploaded contract text is automatically deleted after 30 days
                unless you opt in to extended retention. To enable longer
                retention for your workspace, contact us at hello@clauseium.com —
                we&apos;ll record your separable consent under the DPDP Act.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-counsel-500" />
            <div>
              <p className="text-[14px] font-medium text-ink-100">
                Zero data retention with LLM providers
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-400">
                Your contracts are never stored by the model provider and never
                used to train foundation models.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-counsel-500" />
            <div>
              <p className="text-[14px] font-medium text-ink-100">
                Request earlier deletion
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-400">
                You can request deletion of any contract at any time. Email
                hello@clauseium.com and we&apos;ll remove it within 7 days.
              </p>
            </div>
          </li>
        </ul>
      </Card>

      <Link
        href="/security"
        className="inline-flex items-center gap-2 self-start rounded-lg border border-ink-700 px-4 py-2.5 text-sm font-medium text-ink-300 transition-colors hover:border-ink-500 hover:text-white"
      >
        <ShieldCheck className="h-4 w-4 text-counsel-500" />
        Read our full security posture
      </Link>
    </div>
  );
}
