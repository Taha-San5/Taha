import type { Metadata } from "next";

import { PricingContent } from "@/components/marketing/pricing-content";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Credits only cover work Wasl performs for you. Attach your own model key and AI nodes run free forever.",
};

export default function PricingPage() {
  return <PricingContent />;
}
