import { prisma } from "@/lib/prisma";

/**
 * Liveness + readiness probe. Reports whether the database answers and whether
 * the environment is configured well enough to actually run flows, so a bad
 * deployment fails visibly instead of erroring on first use.
 */
export async function GET() {
  const checks: Record<string, boolean> = {
    database: false,
    authSecret: (process.env.AUTH_SECRET?.length ?? 0) >= 32,
    encryptionKey: (process.env.ENCRYPTION_KEY?.length ?? 0) >= 32,
  };

  let templates = 0;
  try {
    templates = await prisma.template.count();
    checks.database = true;
  } catch {
    checks.database = false;
  }

  const healthy = Object.values(checks).every(Boolean);

  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      templates,
      modelKey: process.env.OPENAI_API_KEY ? "configured" : "simulated",
      version: process.env.npm_package_version ?? "0.1.0",
      time: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
