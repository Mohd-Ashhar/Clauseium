import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  if (oauthError) {
    return htmlResponse({
      status: "error",
      code: "oauth_denied",
      message: oauthError,
    });
  }

  if (!code) {
    return htmlResponse({
      status: "error",
      code: "missing_code",
      message: "No authorization code returned from the provider.",
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.session) {
    return htmlResponse({
      status: "error",
      code: "exchange_failed",
      message: error?.message ?? "Could not establish a session.",
    });
  }

  const session = data.session;
  return htmlResponse({
    status: "ok",
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at ?? null,
    token_type: session.token_type,
  });
}

function htmlResponse(payload: DialogPayload): NextResponse {
  return new NextResponse(renderHtml(payload), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function renderHtml(payload: DialogPayload): string {
  // Escape `<` so the JSON body can never close the surrounding <script> tag,
  // regardless of what arrives in token strings or error messages.
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  const isError = payload.status === "error";
  const title = isError ? "Sign-in failed" : "Signed in";
  const body = isError
    ? "Sign-in did not complete. You can close this window and try again."
    : "Signed in to Clauseium. You can close this window.";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>${title}</title>
    <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
    <style>
      :root { color-scheme: dark; }
      html, body { margin: 0; padding: 0; background: #050505; color: #f0f1f3;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif; }
      main { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
      .card { max-width: 360px; text-align: center; }
      .mark { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
      .mark span { color: #9d80ff; }
      h1 { font-size: 18px; margin: 0 0 8px; font-weight: 600; }
      p { font-size: 13px; line-height: 1.5; color: #c5c8ce; margin: 0; }
      .error h1 { color: #e5484d; }
    </style>
  </head>
  <body>
    <main>
      <div class="card${isError ? " error" : ""}">
        <div class="mark"><span>§</span> Clauseium</div>
        <h1>${title}</h1>
        <p>${body}</p>
      </div>
    </main>
    <script>
      (function () {
        var payload = ${json};
        function post() {
          try {
            if (window.Office && Office.context && Office.context.ui && Office.context.ui.messageParent) {
              Office.context.ui.messageParent(JSON.stringify(payload));
            }
          } catch (e) {
            // No-op: the visible message above already tells the user what happened.
          }
        }
        if (window.Office && typeof Office.onReady === "function") {
          Office.onReady().then(post).catch(post);
        } else {
          // office.js failed to load (CDN blocked, offline, etc.). The fallback
          // visible message is shown instead — the user must close manually.
        }
      })();
    </script>
  </body>
</html>`;
}
