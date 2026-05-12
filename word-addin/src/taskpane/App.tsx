import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { officeReady } from "@addin/office/ready";
import { AuthProvider, useAuth } from "@addin/state/auth-context";
import { LegalFooter } from "./components/LegalFooter";
import { SignedOut } from "./routes/SignedOut";
import { Workspace } from "./routes/Workspace";

export function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const { isSignedIn } = useAuth();
  const [officeStatus, setOfficeStatus] = useState<"loading" | "ready">(
    "loading",
  );

  useEffect(() => {
    let active = true;
    void officeReady().then(() => {
      if (active) setOfficeStatus("ready");
    });
    return () => {
      active = false;
    };
  }, []);

  if (officeStatus === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-ink-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 min-h-0 flex flex-col">
        {isSignedIn ? <Workspace /> : <SignedOut />}
      </div>
      <LegalFooter />
    </div>
  );
}
