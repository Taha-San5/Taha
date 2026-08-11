import type { Metadata } from "next";

import { FlowsDashboard } from "@/components/app/flows-dashboard";
import { requireAuth } from "@/lib/auth";
import { toFlowSummary, toRunView } from "@/lib/flows";
import { hasPlatformKey } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Flows" };

export default async function AppHomePage() {
  const { workspace } = await requireAuth();

  const [flows, runs, credentialCount] = await Promise.all([
    prisma.flow.findMany({
      where: { workspaceId: workspace.id, isArchived: false },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.run.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { startedAt: "desc" },
      take: 8,
      include: { flow: { select: { name: true, emoji: true } } },
    }),
    prisma.credential.count({ where: { workspaceId: workspace.id, provider: "openai" } }),
  ]);

  return (
    <FlowsDashboard
      flows={flows.map(toFlowSummary)}
      recentRuns={runs.map((run) => ({
        ...toRunView(run),
        flowName: run.flow.name,
        flowEmoji: run.flow.emoji,
      }))}
      hasModelKey={credentialCount > 0 || hasPlatformKey()}
    />
  );
}
