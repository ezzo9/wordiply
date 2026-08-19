import { ImageResponse } from "next/og";

export const alt = "Wordiply Unlimited: find the longest word containing your starter letters";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const WORDMARK = "WORDIPLY";
const BRAND = "#0d9488";
const ACCENT = "#f59e0b";
const BG = "#fafaf9";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: BG,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          {WORDMARK.split("").map((letter, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 84,
                height: 84,
                borderRadius: 16,
                background: i % 2 === 0 ? BRAND : ACCENT,
                color: "#ffffff",
                fontSize: 48,
                fontWeight: 800,
              }}
            >
              {letter}
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 12,
            color: "#78716c",
          }}
        >
          UNLIMITED
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: "#1c1917",
            marginTop: 12,
          }}
        >
          Unlimited guesses. One starter. The longest word wins.
        </div>
      </div>
    ),
    { ...size }
  );
}
