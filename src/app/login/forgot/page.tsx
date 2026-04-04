import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { AuthSplitShell } from "@/components/auth-split-shell";
import Link from "next/link";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthSplitShell
      title="Reset password"
      subtitle={`We’ll send a verification code to reset your password (and a secure link in the same email). Your account email must already be confirmed.`}
      footer={
        <Link
          href="/login"
          className="text-muted hover:text-accent font-medium transition-colors"
        >
          ← Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthSplitShell>
  );
}
