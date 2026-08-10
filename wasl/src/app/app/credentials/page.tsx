import type { Metadata } from "next";

import { CredentialsManager } from "@/components/app/credentials-manager";
import { requireAuth } from "@/lib/auth";
import { hasPlatformKey } from "@/lib/llm";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/utils";

export const metadata: Metadata = { title: "Credentials" };

export default async function CredentialsPage() {
  const { workspace } = await requireAuth();

  const credentials = await prisma.credential.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <CredentialsManager
      platformKeyAvailable={hasPlatformKey()}
      credentials={credentials.map((credential) => ({
        id: credential.id,
        name: credential.name,
        provider: credential.provider,
        hint: parseJson<{ hint?: string }>(credential.meta, {}).hint ?? "",
        createdAt: credential.createdAt.toISOString(),
      }))}
    />
  );
}
