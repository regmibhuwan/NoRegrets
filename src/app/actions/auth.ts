"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validations";
import { redirect } from "next/navigation";

export type AuthActionState = {
  error?: string;
  needsEmailConfirm?: boolean;
  email?: string;
};

function serverAppOrigin() {
  const u =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return u.replace(/\/$/, "");
}

function emailRedirectTo() {
  return `${serverAppOrigin()}/auth/callback?next=/onboarding`;
}

function loginHelpMessage(raw: string): string {
  if (/invalid login credentials|email not confirmed/i.test(raw)) {
    return "Wrong email or password—or this email isn’t confirmed yet. Use the code we sent you (check spam), or request a new one from the sign-up page.";
  }
  return raw;
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: loginHelpMessage(error.message) };
  }

  const next = formData.get("next");
  const dest =
    typeof next === "string" && next.startsWith("/") ? next : "/dashboard";
  redirect(dest);
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password, displayName } = parsed.data;
  const redirectUrl = emailRedirectTo();

  const autoConfirm =
    process.env.AUTH_DEV_AUTO_CONFIRM === "true" &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  if (autoConfirm) {
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return {
        error:
          "AUTH_DEV_AUTO_CONFIRM is on but SUPABASE_SERVICE_ROLE_KEY is missing or invalid.",
      };
    }

    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    const supabase = await createClient();

    if (createErr) {
      const low = createErr.message.toLowerCase();
      const duplicate =
        low.includes("already") ||
        low.includes("registered") ||
        low.includes("exists");

      if (duplicate) {
        const { error: signErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!signErr) {
          redirect("/dashboard");
        }
        return {
          error:
            "This email is already registered. Sign in with the right password, or use Forgot password. You can also delete the user in Supabase and try again.",
        };
      }

      return { error: createErr.message };
    }

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr) {
      return {
        error: `${signErr.message} Your account was created—try logging in.`,
      };
    }

    redirect("/onboarding");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect("/onboarding");
  }

  if (data.user) {
    return { needsEmailConfirm: true, email };
  }

  return { error: "Could not create account. Try again." };
}

export async function resendSignupEmailAction(
  _prev: { error?: string; ok?: boolean },
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const raw = String(formData.get("email") ?? "").trim();
  if (!raw) {
    return { error: "Enter your email." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: raw.toLowerCase(),
    options: { emailRedirectTo: emailRedirectTo() },
  });
  if (error) {
    return { error: error.message };
  }
  return { ok: true };
}
