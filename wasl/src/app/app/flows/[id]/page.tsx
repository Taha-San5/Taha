import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Builder } from "@/components/builder/builder";
import { requireAuth } from "@/lib/auth";
import { toFlowDetail } from "@/lib/flows";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const flow = await prisma.flow.findUnique({ where: { id }, select: { name: true } });
  return { title: flow?.name ?? "Flow" };
}

export default async function FlowBuilderPage({ params }: Props) {
  const { workspace } = await requireAuth();
  const { id } = await params;

  const flow = await prisma.flow.findFirst({ where: { id, workspaceId: workspace.id } });
  if (!flow) notFound();

  const detail = toFlowDetail(flow);

  return (
    <Builder
      meta={{
        id: detail.id,
        name: detail.name,
        description: detail.description,
        emoji: detail.emoji,
        status: detail.status,
        triggerType: detail.triggerType,
        webhookToken: detail.webhookToken,
        version: detail.version,
      }}
      graph={detail.graph}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
    />
  );
}
