import { z } from "zod";

import { fail, handleRouteError, ok, readBody } from "@/lib/api";
import { AuthError, createSessionCookie, registerUser } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  locale: z.enum(["ar", "en"]).optional(),
});

export async function POST(request: Request) {
  const body = await readBody(request, schema);
  if (body.error) return body.error;

  try {
    const { user, workspace } = await registerUser(body.data);
    await createSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      workspaceId: workspace.id,
    });
    return ok({ ok: true, redirect: "/app" });
  } catch (error) {
    if (error instanceof AuthError && error.code === "EMAIL_TAKEN") {
      return fail("EMAIL_TAKEN", 409);
    }
    return handleRouteError(error);
  }
}
