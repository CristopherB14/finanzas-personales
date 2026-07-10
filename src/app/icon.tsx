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
          background: "linear-gradient(135deg, #1D4ED8 0%, #0D9488 100%)",
          borderRadius: 8,
        }}
      >
        <div style={{ color: "white", fontSize: 20, fontWeight: 700 }}>K</div>
      </div>
    ),
    { ...size }
  );
}
