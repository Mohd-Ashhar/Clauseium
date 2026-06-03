import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
          borderRadius: 36,
          color: "#c9a449",
          fontSize: 132,
          fontWeight: 800,
          lineHeight: 1,
          fontFamily:
            "'Georgia', 'Times New Roman', ui-serif, serif",
          paddingBottom: 10,
        }}
      >
        §
      </div>
    ),
    { ...size },
  );
}
