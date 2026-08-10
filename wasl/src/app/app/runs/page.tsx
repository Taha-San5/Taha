import type { Metadata } from "next";

import { RunsList } from "@/components/app/runs-list";
import { requireAuth } from "@/lib/auth";
import { toRunView } from "@/lib/flows";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Runs" };

export default async function RunsPage() {
  const { workspace } = await requireAuth();

  const runs = await prisma.run.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { startedAt: "desc" },
    take: 60,
    include: { flow: { select: { name: true, emoji: true } } },
  });

  return (
    <RunsList
      runs={runs.map((run) => ({
        ...toRunView(run),
        flowName: run.flow.name,
        flowEmoji: run.flow.emoji,
      }))}
    />
  );
}
