import { ImageResponse } from "next/og";

export const alt = "SoundStack — deal radar for music producers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0c0d0b",
          color: "#f4f1e8",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: "0.18em", color: "#dff25a" }}>
          SOUNDSTACK
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 76, lineHeight: 0.95, letterSpacing: "-0.03em" }}>
            A short list, not a store.
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#a39e93" }}>
            Plugin sales · Free presets · Boutique sample packs
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
