import { getAuthContext } from "@/lib/auth";
import { toRunView } from "@/lib/flows";
import { prisma } from "@/lib/prisma";
import { stringifyJson } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export const maxDuration = 300;

const POLL_MS = 450;
const MAX_DURATION_MS = 6 * 60 * 1000;

/**
 * Server-sent events feed for a single run.
 *
 * Progress is read from the database rather than an in-memory emitter, so the
 * stream keeps working when the executor runs in a different process or
 * serverless instance than the one holding the connection.
 */
export async function GET(_request: Request, { params }: Params) {
  const context = await getAuthContext();
  if (!context) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const exists = await prisma.run.findFirst({
    where: { id, workspaceId: context.workspace.id },
    select: { id: true },
  });
  if (!exists) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let lastPayload = "";

      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${stringifyJson(data)}\n\n`));
      };

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      while (!closed) {
        const run = await prisma.run.findUnique({
          where: { id },
          include: { nodeRuns: { orderBy: { order: "asc" } } },
        });

        if (!run) {
          send("error", { message: "Run disappeared" });
          break;
        }

        const view = toRunView(run);
        const payload = stringifyJson(view);
        if (payload !== lastPayload) {
          lastPayload = payload;
          send("progress", view);
        }

        if (["succeeded", "failed", "cancelled"].includes(run.status)) {
          send("done", view);
          break;
        }

        if (Date.now() - startedAt > MAX_DURATION_MS) {
          send("error", { message: "Stream timed out" });
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }

      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
