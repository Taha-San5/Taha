import type { Metadata } from "next";

import { CreditsOverview } from "@/components/app/credits-overview";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Credits" };

export default async function CreditsPage() {
  const { workspace } = await requireAuth();

  const [ledger, topFlows, aiCredentialCount] = await Promise.all([
    prisma.creditLedger.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.run.groupBy({
      by: ["flowId"],
      where: { workspaceId: workspace.id, creditsUsed: { gt: 0 } },
      _sum: { creditsUsed: true },
      _count: { _all: true },
      orderBy: { _sum: { creditsUsed: "desc" } },
      take: 6,
    }),
    prisma.credential.count({ where: { workspaceId: workspace.id, provider: "openai" } }),
  ]);

  const flowNames = await prisma.flow.findMany({
    where: { id: { in: topFlows.map((entry) => entry.flowId) } },
    select: { id: true, name: true, emoji: true },
  });
  const nameById = new Map(flowNames.map((flow) => [flow.id, flow]));

  return (
    <CreditsOverview
      workspace={{
        plan: workspace.plan,
        creditBalance: workspace.creditBalance,
        creditsIncluded: workspace.creditsIncluded,
        periodStart: workspace.periodStart.toISOString(),
      }}
      usesOwnKey={aiCredentialCount > 0}
      ledger={ledger.map((entry) => ({
        id: entry.id,
        delta: entry.delta,
        reason: entry.reason,
        balanceAfter: entry.balanceAfter,
        createdAt: entry.createdAt.toISOString(),
        refId: entry.refId,
      }))}
      topFlows={topFlows.map((entry) => ({
        flowId: entry.flowId,
        name: nameById.get(entry.flowId)?.name ?? entry.flowId,
        emoji: nameById.get(entry.flowId)?.emoji ?? "Zap",
        credits: entry._sum.creditsUsed ?? 0,
        runs: entry._count._all,
      }))}
    />
  );
}
