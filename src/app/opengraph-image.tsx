import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Clauseium — AI contract review for Indian in-house counsel";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#050505",
          color: "#fafaf9",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          position: "relative",
          padding: 64,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -160,
            width: 720,
            height: 720,
            borderRadius: 9999,
            background:
              "radial-gradient(closest-side, rgba(201,164,73,0.45), rgba(201,164,73,0.12) 55%, rgba(201,164,73,0) 75%)",
            filter: "blur(20px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -240,
            left: -120,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background:
              "radial-gradient(closest-side, rgba(201,164,73,0.22), rgba(201,164,73,0.05) 60%, rgba(201,164,73,0) 80%)",
            filter: "blur(20px)",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#c9a449",
              lineHeight: 1,
              fontFamily: "'Georgia', 'Times New Roman', serif",
              display: "flex",
            }}
          >
            §
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "#f0f1f3",
              letterSpacing: -1,
              display: "flex",
            }}
          >
            Clauseium
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            marginTop: "auto",
            marginBottom: "auto",
            maxWidth: 960,
          }}
        >
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: "#fafaf9",
              lineHeight: 1.08,
              letterSpacing: -1.5,
              display: "flex",
            }}
          >
            AI contract review for Indian in-house counsel
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: "#c5c8ce",
              lineHeight: 1.4,
              display: "flex",
              maxWidth: 880,
            }}
          >
            Grounded in the Indian Contract Act, DPDP, and your own playbook.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            {[
              "Every clause cited",
              "Every risk flagged",
              "6 min review",
            ].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 18px",
                  borderRadius: 9999,
                  background: "#14171c",
                  border: "1px solid #1f2329",
                  color: "#f0f1f3",
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              color: "#6b7280",
              fontSize: 20,
              fontFamily:
                "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
            }}
          >
            clauseium.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
