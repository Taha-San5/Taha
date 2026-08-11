import {
  Comparison,
  Features,
  FinalCta,
  Hero,
  HowItWorks,
  NodeCatalogue,
  ProviderStrip,
  TemplateShowcase,
} from "@/components/marketing/landing-sections";
import { Reveal } from "@/components/reveal";
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
      {/* The hero and provider strip are above the fold, so they are not
          wrapped — revealing content the visitor can already see would just
          delay it. */}
      <Hero />
      <ProviderStrip />

      <Reveal>
        <Features />
      </Reveal>
      <Reveal>
        <HowItWorks />
      </Reveal>
      <Reveal>
        <NodeCatalogue />
      </Reveal>
      <Reveal>
        <Comparison />
      </Reveal>
      <Reveal>
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
      </Reveal>
      <FinalCta />
    </>
  );
}
