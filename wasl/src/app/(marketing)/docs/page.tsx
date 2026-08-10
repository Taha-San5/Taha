import type { Metadata } from "next";

import { DocsContent } from "@/components/marketing/docs-content";

export const metadata: Metadata = {
  title: "Documentation",
  description: "How the Wasl execution engine works — nodes, expressions, the REST API and self-hosting.",
};

export default function DocsPage() {
  return <DocsContent appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"} />;
}
