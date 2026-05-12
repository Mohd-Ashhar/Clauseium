import type { ReactNode } from "react";

export const metadata = {
  title: "Sign in · Word add-in",
  robots: { index: false, follow: false },
};

export default function AddinAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 font-sans">
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-[380px]">{children}</div>
      </main>
    </div>
  );
}
