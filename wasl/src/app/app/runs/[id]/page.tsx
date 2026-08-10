import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RunDetail } from "@/components/app/run-detail";
import { requireAuth } from "@/lib/auth";
import { toRunView } from "@/lib/flows";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Run trace" };

export default async function RunDetailPage({ params }: Props) {
  const { workspace } = await requireAuth();
  const { id } = await params;

  const run = await prisma.run.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      nodeRuns: { orderBy: { order: "asc" } },
      flow: { select: { id: true, name: true, emoji: true } },
    },
  });
  if (!run) notFound();

  return (
    <RunDetail
      run={toRunView(run)}
      flow={{ id: run.flow.id, name: run.flow.name, emoji: run.flow.emoji }}
    />
  );
}
