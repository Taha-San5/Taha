import type { MetadataRoute } from "next";

/** Lets the site be saved to a home screen and open without browser chrome. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wasl — visual AI workflow automation",
    short_name: "Wasl",
    description:
      "Drag nodes onto a canvas, wire them together, and ship automations that read the web, reason with a model and take action.",
    start_url: "/app",
    display: "standalone",
    background_color: "#06070a",
    theme_color: "#06070a",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      // Served by the generated app/apple-icon.tsx route.
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
