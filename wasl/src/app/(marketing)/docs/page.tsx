import type { Metadata } from "next";

import { DocsContent } from "@/components/marketing/docs-content";
import { getAppUrl } from "@/lib/app-url";

export const metadata: Metadata = {
  title: "Documentation",
  description: "How the Wasl execution engine works — nodes, expressions, the REST API and self-hosting.",
};

export default async function DocsPage() {
  return <DocsContent appUrl={await getAppUrl()} />;
}
