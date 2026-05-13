import { useEffect, useState } from "react";
import { officeReady, type OfficeReadyInfo } from "@addin/office/ready";
import { AuthProvider, useAuth } from "@addin/state/auth-context";
import { LegalFooter } from "./components/LegalFooter";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { NotInWordExplainer } from "./components/NotInWordExplainer";
import { ErrorBoundary } from "./routes/Error";
import { SignedOut } from "./routes/SignedOut";
import { Workspace } from "./routes/Workspace";

// Top-level app shell:
//   ErrorBoundary       — catches any render-time crash anywhere below.
//     AuthProvider      — provides tokens + sign in/out to the tree.
//       Shell           — branches on Office readiness:
//         loading       → LoadingSkeleton
//         non-Word host → NotInWordExplainer (Safari, Pages, Excel, ...)
//         Word host     → SignedOut | Workspace (depending on auth state)
//
// The ErrorBoundary sits OUTSIDE AuthProvider so a crash in the auth context
// itself (rare but possible if localStorage gets corrupted) is still caught.

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ErrorBoundary>
  );
}

function Shell() {
  const { isSignedIn } = useAuth();
  const [officeInfo, setOfficeInfo] = useState<OfficeReadyInfo | null>(null);

  useEffect(() => {
    let active = true;
    void officeReady().then((info) => {
      if (active) setOfficeInfo(info);
    });
    return () => {
      active = false;
    };
  }, []);

  if (officeInfo === null) {
    return <LoadingSkeleton />;
  }

  // Visiting the taskpane URL outside Word — Safari for visual smoke
  // testing, macOS Pages opening the .docx, or accidental Excel sideload —
  // gets the explainer instead of the sign-in screen they can never
  // complete.
  if (!officeInfo.isOfficeHost) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-1 min-h-0 flex flex-col">
          <NotInWordExplainer
            // HostType / PlatformType are string enums; cast through String()
            // so the component contract stays plain `string | null` and
            // doesn't drag the Office enum types into the component.
            host={officeInfo.host ? String(officeInfo.host) : null}
            platform={officeInfo.platform ? String(officeInfo.platform) : null}
          />
        </div>
        <LegalFooter />
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
