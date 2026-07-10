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
          background: "linear-gradient(135deg, #1D4ED8 0%, #0D9488 100%)",
          borderRadius: 36,
        }}
      >
        <div style={{ color: "white", fontSize: 96, fontWeight: 700 }}>K</div>
      </div>
    ),
    { ...size }
  );
}
