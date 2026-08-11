import type { Metadata } from "next";

import { TemplateGallery } from "@/components/marketing/template-gallery";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EMPTY_GRAPH, type FlowGraph } from "@/lib/nodes/types";
import { parseJson } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Templates",
  description: "Working AI automation flows you can install into your workspace in one click.",
};

export default async function TemplatesPage() {
  const [templates, session] = await Promise.all([
    prisma.template.findMany({ orderBy: [{ featured: "desc" }, { installs: "desc" }] }),
    getSession(),
  ]);

  return (
    <TemplateGallery
      signedIn={Boolean(session)}
      templates={templates.map((template) => {
        const graph = parseJson<FlowGraph>(template.graph, EMPTY_GRAPH);
        return {
          slug: template.slug,
          name: template.name,
          nameAr: template.nameAr,
          description: template.description,
          descriptionAr: template.descriptionAr,
          category: template.category,
          emoji: template.emoji,
          featured: template.featured,
          installs: template.installs,
          nodeCount: graph.nodes.length,
          nodeTypes: [...new Set(graph.nodes.map((node) => node.type))],
        };
      })}
    />
  );
}
