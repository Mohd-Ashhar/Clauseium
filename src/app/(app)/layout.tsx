import type { Metadata } from "next";
import { AppSidebar } from "@/components/app/app-sidebar";
import { SidebarProvider } from "@/components/app/sidebar-context";
import { TopBar } from "@/components/app/top-bar";

export const metadata: Metadata = {
  title: "Workspace",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-ink-950 text-ink-100 font-sans">
        <AppSidebar />
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
