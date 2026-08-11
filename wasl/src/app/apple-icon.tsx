import { ImageResponse } from "next/og";

/**
 * Home-screen icon for iOS.
 *
 * Generated as a PNG rather than shipped as an SVG file: Next only accepts
 * raster formats for the `apple-icon` convention (iOS ignores SVG touch icons),
 * so an apple-icon.svg is silently dropped from the output.
 *
 * iOS applies its own rounded mask, so the tile is drawn full-bleed.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0c12",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
          <defs>
            <linearGradient id="ai" x1="40" y1="90" x2="150" y2="55" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a5b4fc" />
              <stop offset="0.55" stopColor="#818cf8" />
              <stop offset="1" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <path d="M48 90C76 90 84 53 132 53" stroke="url(#ai)" strokeWidth="13" strokeLinecap="round" />
          <path
            d="M48 90C76 90 84 127 132 127"
            stroke="url(#ai)"
            strokeWidth="13"
            strokeLinecap="round"
            opacity="0.58"
          />
          <circle cx="44" cy="90" r="18" fill="url(#ai)" />
          <circle cx="137" cy="53" r="15" fill="url(#ai)" />
          <circle cx="137" cy="127" r="15" fill="url(#ai)" opacity="0.62" />
        </svg>
      </div>
    ),
    size,
  );
}
