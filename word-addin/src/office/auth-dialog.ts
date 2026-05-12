// Office Dialog API → Supabase OAuth bridge.
//
// Flow:
//   1. Task pane calls openAuthDialog(provider).
//   2. We Office.context.ui.displayDialogAsync(url, …) — opens an iframe
//      (Word Online) or native window (Word Desktop) at the addin-auth
//      page on the main Clauseium app origin.
//   3. The page runs Supabase signInWithOAuth(provider) → user signs in
//      with Google / Microsoft → Supabase redirects to
//      /addin-auth/callback?code=… on the same origin.
//   4. The callback exchanges the code, then renders a tiny HTML page
//      whose only JS calls Office.context.ui.messageParent(payload).
//   5. The dialog's DialogMessageReceived event fires here. We parse the
//      payload, close the dialog, resolve/reject.
//
// Pitfalls handled:
//   - User closes the dialog mid-flow → DialogEventReceived 12006 fires
//     → reject with "cancelled".
//   - Popup blocker or invalid URL → displayDialogAsync's outer callback
//     reports asyncResult.error → reject with "open_failed".
//   - displayInIframe must be false for cross-origin auth: Google/Azure
//     refuse to load in an iframe (X-Frame-Options DENY). Word Desktop
//     opens a real window; Word Online opens a same-origin iframe but
//     navigates it cross-origin, which works for OAuth redirects.

import { APP_ORIGIN } from "@addin/config";
import type { AuthTokens } from "@addin/types/contract";

export type AuthProvider = "google" | "azure";

export class AuthDialogError extends Error {
  constructor(
    public readonly code:
      | "cancelled"
      | "open_failed"
      | "oauth_denied"
      | "exchange_failed"
      | "missing_code"
      | "office_unavailable"
      | "bad_payload",
    message: string,
  ) {
    super(message);
    this.name = "AuthDialogError";
  }
}

interface SuccessPayload {
  status: "ok";
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
  token_type: string;
}

interface ErrorPayload {
  status: "error";
  code: string;
  message: string;
}

type DialogPayload = SuccessPayload | ErrorPayload;

export async function openAuthDialog(
  provider: AuthProvider,
): Promise<AuthTokens> {
  if (typeof window === "undefined" || !window.Office?.context?.ui) {
    throw new AuthDialogError(
      "office_unavailable",
      "Office Dialog API is not available — open this inside Word.",
    );
  }

  const url = `${APP_ORIGIN}/addin-auth?provider=${encodeURIComponent(provider)}`;

  return new Promise<AuthTokens>((resolve, reject) => {
    Office.context.ui.displayDialogAsync(
      url,
      // displayInIframe: false → Word Desktop opens a native window; Word
      // Online opens a same-origin iframe. Both navigate cross-origin
      // during OAuth, which is required (Google/Azure block X-Frame-Options).
      { height: 60, width: 50, displayInIframe: false, promptBeforeOpen: false },
      (result) => {
        if (result.status !== Office.AsyncResultStatus.Succeeded) {
          reject(
            new AuthDialogError(
              "open_failed",
              result.error?.message ?? "Could not open sign-in dialog",
            ),
          );
          return;
        }

        const dialog = result.value;
        let settled = false;
        const safeClose = () => {
          try {
            dialog.close();
          } catch {
            // Dialog may already be closed by the user.
          }
        };

        dialog.addEventHandler(
          Office.EventType.DialogMessageReceived,
          (arg) => {
            if (settled) return;
            settled = true;

            const messageArg = arg as Office.DialogParentMessageReceivedEventArgs;
            const raw = messageArg.message ?? "";
            let payload: DialogPayload;
            try {
              payload = JSON.parse(raw) as DialogPayload;
            } catch {
              safeClose();
              reject(
                new AuthDialogError(
                  "bad_payload",
                  "Sign-in returned an unreadable payload.",
                ),
              );
              return;
            }

            safeClose();

            if (payload.status === "ok") {
              resolve({
                access_token: payload.access_token,
                refresh_token: payload.refresh_token,
                expires_at: payload.expires_at,
                token_type: payload.token_type,
              });
              return;
            }

            const errCode = mapErrorCode(payload.code);
            reject(new AuthDialogError(errCode, payload.message));
          },
        );

        dialog.addEventHandler(
          Office.EventType.DialogEventReceived,
          (arg) => {
            if (settled) return;
            // 12006 = user closed the dialog before completion.
            // 12002, 12004, 12007 are Microsoft's other dialog errors.
            const eventArg = arg as { error: number };
            settled = true;
            if (eventArg.error === 12006) {
              reject(
                new AuthDialogError("cancelled", "Sign-in window was closed."),
              );
            } else {
              reject(
                new AuthDialogError(
                  "open_failed",
                  `Dialog error ${eventArg.error}`,
                ),
              );
            }
          },
        );
      },
    );
  });
}

function mapErrorCode(code: string): AuthDialogError["code"] {
  switch (code) {
    case "oauth_denied":
      return "oauth_denied";
    case "missing_code":
      return "missing_code";
    case "exchange_failed":
      return "exchange_failed";
    default:
      return "bad_payload";
  }
}
