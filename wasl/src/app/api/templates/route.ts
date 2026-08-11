import { ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { EMPTY_GRAPH, type FlowGraph } from "@/lib/nodes/types";
import { parseJson } from "@/lib/utils";

/** Public: the template gallery is browsable without an account. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");

  const templates = await prisma.template.findMany({
    where: category && category !== "all" ? { category } : undefined,
    orderBy: [{ featured: "desc" }, { installs: "desc" }],
  });

  return ok({
    templates: templates.map((template) => ({
      id: template.id,
      slug: template.slug,
      name: template.name,
      nameAr: template.nameAr,
      description: template.description,
      descriptionAr: template.descriptionAr,
      category: template.category,
      emoji: template.emoji,
      featured: template.featured,
      installs: template.installs,
      nodeCount: parseJson<FlowGraph>(template.graph, EMPTY_GRAPH).nodes.length,
    })),
  });
}
