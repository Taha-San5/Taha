import { ImageResponse } from "next/og";

import { MODELS } from "@/lib/models";
import { NODE_DEFINITIONS } from "@/lib/nodes/registry";

/**
 * Social preview card, rendered on demand.
 *
 * Without this, sharing a link anywhere renders an empty rectangle. Satori (the
 * renderer behind ImageResponse) supports only flexbox and a subset of CSS, so
 * every container here is an explicit flex box and there is no grid or custom
 * font loading to fail at request time.
 */

export const alt = "Wasl — build AI workflows visually";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const nodeCount = NODE_DEFINITIONS.length;
  const providerCount = new Set(MODELS.map((model) => model.provider)).size;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#06070a",
          backgroundImage:
            "radial-gradient(circle at 18% 12%, rgba(99,102,241,0.30), transparent 45%), radial-gradient(circle at 88% 85%, rgba(34,211,238,0.20), transparent 45%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="og" x1="5" y1="16" x2="27" y2="9" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a5b4fc" />
                <stop offset="0.55" stopColor="#818cf8" />
                <stop offset="1" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
            <path d="M7.5 16C13 16 14.5 8.5 24 8.5" stroke="url(#og)" strokeWidth="2.4" strokeLinecap="round" />
            <path
              d="M7.5 16C13 16 14.5 23.5 24 23.5"
              stroke="url(#og)"
              strokeWidth="2.4"
              strokeLinecap="round"
              opacity="0.55"
            />
            <circle cx="6.4" cy="16" r="3.5" fill="url(#og)" />
            <circle cx="25.2" cy="8.5" r="2.9" fill="url(#og)" />
            <circle cx="25.2" cy="23.5" r="2.9" fill="url(#og)" opacity="0.62" />
          </svg>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 600, color: "#e2e6ef", letterSpacing: -0.5 }}>
            Wasl
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 74,
              fontWeight: 600,
              color: "#e2e6ef",
              lineHeight: 1.06,
              letterSpacing: -2.2,
              maxWidth: 940,
            }}
          >
            Build AI coworkers, not spreadsheets
          </div>
          <div style={{ display: "flex", fontSize: 27, color: "#8b94a8", lineHeight: 1.45, maxWidth: 860 }}>
            A visual builder for AI workflows — drag nodes onto a canvas, wire them together, and watch every
            step run with a live trace.
          </div>
        </div>

        {/* stats */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {[
            `${nodeCount} node types`,
            `${MODELS.length} models`,
            `${providerCount} providers`,
            "Live run traces",
          ].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "11px 20px",
                borderRadius: 999,
                border: "1px solid #262c3d",
                backgroundColor: "rgba(18,21,31,0.75)",
                fontSize: 21,
                color: "#b9c0cf",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
