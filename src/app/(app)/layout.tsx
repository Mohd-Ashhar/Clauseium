import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app/app-sidebar";
import { SidebarProvider } from "@/components/app/sidebar-context";
import { TopBar } from "@/components/app/top-bar";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const metadata: Metadata = {
  title: "Workspace",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-ink-950 text-ink-100 font-sans">
        <AppSidebar user={user} />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto dark-scrollbar">
            <div className="px-6 py-6 max-w-[1280px] mx-auto w-full">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
