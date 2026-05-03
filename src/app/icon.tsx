import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 6,
          color: "#7c5cff",
          fontSize: 24,
          fontWeight: 800,
          lineHeight: 1,
          fontFamily:
            "'Georgia', 'Times New Roman', ui-serif, serif",
          paddingBottom: 2,
        }}
      >
        §
      </div>
    ),
    { ...size },
  );
}
