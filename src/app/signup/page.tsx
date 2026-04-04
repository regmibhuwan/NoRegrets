import { SignupForm } from "@/components/auth-forms";
import { AuthSplitShell } from "@/components/auth-split-shell";
import Link from "next/link";

export default function SignupPage() {
  return (
    <AuthSplitShell
      title="Create your account"
      subtitle="Free to start. Your decisions stay private to you."
      footer={
        <p className="text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-accent hover:underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthSplitShell>
  );
}
