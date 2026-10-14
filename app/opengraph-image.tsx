import { ImageResponse } from "next/og";

export const alt = "SoundStack deal radar for music producers";
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
          background: "#090a0b",
          color: "#ece7dc",
          padding: "72px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#ff5c39",
          }}
        >
          SoundStack
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 68, lineHeight: 1.05, maxWidth: 900 }}>
            Plugins, presets, and packs worth opening.
          </div>
          <div style={{ fontSize: 28, color: "#9a9488", maxWidth: 820 }}>
            Daily plugin sales, free Serum / Vital / Diva presets, and boutique
            soundware.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
