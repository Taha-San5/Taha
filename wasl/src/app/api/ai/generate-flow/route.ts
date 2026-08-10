import { z } from "zod";

import { ok, readBody, withAuth } from "@/lib/api";
import { generateFlow } from "@/lib/ai/flow-generator";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  prompt: z.string().trim().min(8, "Describe the flow in a little more detail").max(4000),
  credentialId: z.string().trim().optional(),
});

export const POST = withAuth(async (context, request) => {
  const body = await readBody(request, schema);
  if (body.error) return body.error;

  // Prefer an explicit credential, then any OpenAI credential in the workspace.
  let apiKey: string | undefined;
  const credential = body.data.credentialId
    ? await prisma.credential.findFirst({
        where: { id: body.data.credentialId, workspaceId: context.workspace.id },
      })
    : await prisma.credential.findFirst({
        where: { workspaceId: context.workspace.id, provider: "openai" },
        orderBy: { createdAt: "desc" },
      });

  if (credential) {
    try {
      apiKey = decryptSecret(credential.secretCipher);
    } catch {
      apiKey = undefined;
    }
  }

  const generated = await generateFlow(body.data.prompt, apiKey);
  return ok({ generated });
});
