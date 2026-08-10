import type { Metadata } from "next";

import { ApiKeysManager } from "@/components/app/api-keys-manager";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "API keys" };

export default async function ApiKeysPage() {
  const { workspace } = await requireAuth();

  const keys = await prisma.apiKey.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ApiKeysManager
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
      keys={keys.map((key) => ({
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        revokedAt: key.revokedAt?.toISOString() ?? null,
        createdAt: key.createdAt.toISOString(),
      }))}
    />
  );
}
