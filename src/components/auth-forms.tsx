"use client";

import {
  type AuthActionState,
  signInAction,
  signUpAction,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { getPublicSiteOrigin } from "@/lib/site-url";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full h-12 text-base font-medium" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function LoginForm({
  nextPath,
  urlError,
  urlMessage,
}: {
  nextPath?: string;
  urlError?: string;
  urlMessage?: string;
}) {
  const [state, formAction] = useFormState<AuthActionState, FormData>(
    signInAction,
    {}
  );

  const urlHint =
    urlError === "session"
      ? urlMessage
        ? `Could not finish sign-in: ${urlMessage}`
        : "Confirmation link expired or invalid. Try again from your email."
      : urlError === "missing_code"
        ? "That link was incomplete. Use the latest email we sent."
        : null;

  return (
    <form action={formAction} className="space-y-5">
      <input
        type="hidden"
        name="next"
        value={nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard"}
      />
      {urlHint && (
        <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
          {urlHint}
        </p>
      )}
      {state.error && (
        <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3 leading-relaxed">
          {state.error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/login/forgot"
            className="text-xs font-medium text-accent hover:underline underline-offset-2"
          >
            Forgot?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={6}
          placeholder="••••••••"
        />
      </div>
      <SubmitButton label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}

function SignupPendingPanel({ email }: { email: string }) {
  const router = useRouter();
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const redirectTo = `${getPublicSiteOrigin()}/auth/callback?next=/onboarding`;

  async function resendConfirmation() {
    setResendMessage(null);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (resendError) {
      setResendMessage(resendError.message);
      return;
    }
    setResendMessage("__sent__");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setVerifyError(null);
    const token = code.replace(/\D/g, "").slice(0, 8);
    if (token.length < 6) {
      setVerifyError("Enter the code from your email (usually 6 digits).");
      return;
    }
    setVerifyLoading(true);
    const supabase = createClient();
    const first = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    let session = first.data.session;
    let err = first.error;
    if (!session && err) {
      const second = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      });
      session = second.data.session;
      err = second.error;
    }
    setVerifyLoading(false);
    if (session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }
    setVerifyError(
      err?.message ??
        "That code didn’t work. Try again or use the link in the same email."
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-accent-soft/30 dark:bg-accent-soft/10 border border-accent/20 px-4 py-3">
        <p className="text-sm font-medium text-foreground">Verify your email</p>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          We sent a message to{" "}
          <span className="text-foreground font-medium">{email}</span>. Enter
          the verification code below—you’ll be signed in and can finish
          setup. If the email has a button link instead, you can use that too.
        </p>
      </div>

      <form onSubmit={verifyCode} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="signup-otp">Verification code</Label>
          <Input
            id="signup-otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="tracking-widest font-mono text-lg"
            maxLength={12}
          />
        </div>
        {verifyError && (
          <p className="text-sm text-danger">{verifyError}</p>
        )}
        <Button type="submit" className="w-full h-11" disabled={verifyLoading}>
          {verifyLoading ? "Verifying…" : "Verify and continue"}
        </Button>
      </form>

      {resendMessage && (
        <p
          className={`text-sm ${resendMessage === "__sent__" ? "text-accent" : "text-danger"}`}
        >
          {resendMessage === "__sent__"
            ? "Another email is on the way."
            : resendMessage}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="secondary" onClick={resendConfirmation}>
          Resend email
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/login")}>
          Back to sign in
        </Button>
      </div>
    </div>
  );
}

export function SignupForm() {
  const [state, formAction] = useFormState<AuthActionState, FormData>(
    signUpAction,
    {}
  );

  if (state.needsEmailConfirm && state.email) {
    return <SignupPendingPanel email={state.email} />;
  }

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3 leading-relaxed">
          {state.error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="displayName">What should we call you?</Label>
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          required
          placeholder="First name or nickname"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="At least 6 characters"
        />
      </div>
      <SubmitButton label="Create account" pendingLabel="Creating…" />
    </form>
  );
}
