import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { AuthSplitShell } from "@/components/auth-split-shell";
import Link from "next/link";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthSplitShell
      title="Reset password"
      subtitle="Enter your email and we’ll send you a link to choose a new password."
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
