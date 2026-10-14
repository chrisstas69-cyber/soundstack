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
          background: "#090a0b",
          color: "#ff5c39",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}
