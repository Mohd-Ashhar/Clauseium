"use client";

// Last-resort boundary: catches errors thrown in the root layout itself, so it
// must render its own <html>/<body> and never leak a stack trace to the user.
import "./globals.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
          color: "#f0f1f3",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 26,
              fontWeight: 500,
            }}
          >
            <span style={{ color: "#c9a449" }}>§</span> Something went wrong
          </div>
          <p
            style={{
              marginTop: 12,
              fontSize: 14,
              lineHeight: 1.6,
              color: "#8a8a82",
            }}
          >
            An unexpected error interrupted your session. Your contracts are safe.
            Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              height: 44,
              padding: "0 22px",
              borderRadius: 10,
              border: "none",
              background: "#c9a449",
              color: "#050505",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
