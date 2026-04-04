"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { getPublicSiteOrigin } from "@/lib/site-url";
import { emailOnlySchema } from "@/lib/validations";
import Link from "next/link";
import { useState } from "react";

type Step = "email" | "sent";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const callbackForRecovery = () => {
    const base = getPublicSiteOrigin();
    const next = encodeURIComponent("/auth/update-password");
    return `${base}/auth/callback?next=${next}`;
  };

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const parsed = emailOnlySchema.safeParse({ email: fd.get("email") });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    const em = parsed.data.email;
    setLoading(true);
    const supabase = createClient();
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(em, {
      redirectTo: callbackForRecovery(),
    });
    setLoading(false);
    if (resetErr) {
      setError(resetErr.message);
      return;
    }
    setEmail(em);
    setStep("sent");
  }

  if (step === "sent") {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-accent/20 bg-accent-soft/20 dark:bg-accent-soft/10 px-4 py-4">
          <p className="text-sm font-medium text-foreground">Check your email</p>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            If an account exists for{" "}
            <span className="text-foreground font-medium">{email}</span>, we’ve
            sent a link to reset your password. It may take a minute—check spam
            too. Open the link on this device to finish.
          </p>
        </div>
        {error && (
          <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={loading}
            onClick={async () => {
              setError(null);
              setLoading(true);
              const supabase = createClient();
              const { error: rErr } = await supabase.auth.resetPasswordForEmail(
                email,
                { redirectTo: callbackForRecovery() }
              );
              setLoading(false);
              if (rErr) setError(rErr.message);
            }}
          >
            Resend email
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={() => {
              setStep("email");
              setError(null);
            }}
          >
            Use a different email
          </Button>
        </div>
        <Link
          href="/login"
          className="text-sm text-accent font-medium hover:underline inline-block"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={sendReset} className="space-y-5">
      {error && (
        <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      <Button type="submit" className="w-full h-12" disabled={loading}>
        {loading ? "Sending…" : "Send reset email"}
      </Button>
    </form>
  );
}
