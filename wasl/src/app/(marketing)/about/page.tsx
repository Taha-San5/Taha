import type { Metadata } from "next";

import { AboutContent } from "@/components/marketing/about-content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Wasl is built by Taha Abdelrahman — a visual builder for AI workflows, with a real execution engine and a live trace of every step.",
};

export default function AboutPage() {
  return <AboutContent />;
}
