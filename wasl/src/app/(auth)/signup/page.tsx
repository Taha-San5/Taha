import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/auth";
import { isGoogleConfigured } from "@/lib/oauth/google";

export const metadata: Metadata = { title: "Create your workspace" };

export default async function SignupPage() {
  if (await getSession()) redirect("/app");
  return (
    <Suspense>
      <AuthForm mode="signup" googleEnabled={isGoogleConfigured()} />
    </Suspense>
  );
}
