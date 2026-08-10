import { z } from "zod";

import { fail, handleRouteError, ok, readBody } from "@/lib/api";
import { AuthError, authenticate, createSessionCookie } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export async function POST(request: Request) {
  const body = await readBody(request, schema);
  if (body.error) return body.error;

  try {
    const { user, workspaceId } = await authenticate(body.data.email, body.data.password);
    await createSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      workspaceId,
    });
    return ok({ ok: true, redirect: "/app" });
  } catch (error) {
    if (error instanceof AuthError) {
      return fail(error.code, 401);
    }
    return handleRouteError(error);
  }
}
