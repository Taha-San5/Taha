"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Icon } from "@/components/icon";
import { GoogleLogo } from "@/components/provider-logos";
import { Alert, Button, Field, Input } from "@/components/ui/kit";

export function AuthForm({ mode, googleEnabled }: { mode: "login" | "signup"; googleEnabled: boolean }) {
  const { d, locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";

  function messageFor(code: string): string {
    if (code === "EMAIL_TAKEN") return d.auth.emailTaken;
    if (code === "USE_GOOGLE_SIGNIN") return d.auth.useGoogleSignin;
    if (code === "INVALID_CREDENTIALS" || code === "NO_WORKSPACE") return d.auth.invalidCredentials;
    return code || d.common.error;
  }

  // The OAuth callback reports failures by redirecting back with ?error=...
  const oauthError = params.get("error");
  const oauthMessage = oauthError
    ? ((d.auth.googleErrors as Record<string, string>)[oauthError] ?? d.auth.googleErrors.google_failed)
    : null;

  const nextParam = params.get("next");
  const googleHref = `/api/auth/google${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ""}`;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSignup ? { name, email, password, locale } : { email, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(messageFor(payload.error));
        setPending(false);
        return;
      }

      // Install a template straight after signup when arriving from the gallery.
      const template = params.get("template");
      if (template) {
        try {
          const install = await fetch(`/api/templates/${template}/install`, { method: "POST" });
          if (install.ok) {
            const installed = await install.json();
            router.push(`/app/flows/${installed.flow.id}`);
            return;
          }
        } catch {
          /* fall through to the dashboard */
        }
      }

      router.push(params.get("next") ?? payload.redirect ?? "/app");
    } catch {
      setError(d.common.error);
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-100">
          {isSignup ? d.auth.signupTitle : d.auth.loginTitle}
        </h1>
        <p className="text-[13.5px] text-ink-400">{isSignup ? d.auth.signupSubtitle : d.auth.loginSubtitle}</p>
      </header>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {oauthMessage && !error ? <Alert tone="danger">{oauthMessage}</Alert> : null}

      {googleEnabled ? (
        <>
          <a
            href={googleHref}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-ink-600 bg-ink-900/60 text-[14px] font-medium text-ink-100 transition-colors hover:border-ink-500 hover:bg-ink-800"
          >
            <GoogleLogo size={17} />
            {d.auth.google}
          </a>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-ink-700" />
            <span className="text-[11.5px] text-ink-500">{d.auth.orDivider}</span>
            <span className="h-px flex-1 bg-ink-700" />
          </div>
        </>
      ) : null}

      <form onSubmit={submit} className="space-y-4">
        {isSignup ? (
          <Field label={d.auth.name}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              maxLength={80}
              placeholder={locale === "ar" ? "محمد أحمد" : "Alex Doe"}
            />
          </Field>
        ) : null}

        <Field label={d.auth.email}>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            dir="ltr"
            placeholder="you@company.com"
          />
        </Field>

        <Field label={d.auth.password} hint={isSignup ? d.auth.passwordHint : undefined}>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : 1}
              dir="ltr"
              className="pe-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-ink-400 transition-colors hover:text-ink-200"
            >
              <Icon name={showPassword ? "EyeOff" : "Eye"} size={15} />
            </button>
          </div>
        </Field>

        <Button type="submit" size="lg" loading={pending} className="w-full justify-center">
          {isSignup ? d.auth.submitSignup : d.auth.submitLogin}
        </Button>
      </form>

      <p className="text-[13px] text-ink-400">
        {isSignup ? d.auth.haveAccount : d.auth.noAccount}{" "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-brand-300 underline-offset-4 hover:underline"
        >
          {isSignup ? d.common.signIn : d.common.signUp}
        </Link>
      </p>


    </div>
  );
}
