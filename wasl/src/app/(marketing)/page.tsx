import {
  Comparison,
  Features,
  FinalCta,
  Hero,
  HowItWorks,
  NodeCatalogue,
  TemplateShowcase,
} from "@/components/marketing/landing-sections";
import { prisma } from "@/lib/prisma";
import { EMPTY_GRAPH, type FlowGraph } from "@/lib/nodes/types";
import { parseJson } from "@/lib/utils";

export const revalidate = 300;

export default async function LandingPage() {
  const templates = await prisma.template.findMany({
    where: { featured: true },
    orderBy: { installs: "desc" },
    take: 6,
  });

  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <NodeCatalogue />
      <Comparison />
      <TemplateShowcase
        templates={templates.map((template) => ({
          slug: template.slug,
          name: template.name,
          nameAr: template.nameAr,
          description: template.description,
          descriptionAr: template.descriptionAr,
          emoji: template.emoji,
          installs: template.installs,
          nodeCount: parseJson<FlowGraph>(template.graph, EMPTY_GRAPH).nodes.length,
        }))}
      />
      <FinalCta />
    </>
  );
}
