import { UpdatePasswordForm } from "@/components/update-password-form";
import Link from "next/link";

export const metadata = { title: "New password" };

export default function UpdatePasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-center mb-2">
          Choose a new password
        </h1>
        <p className="text-sm text-muted text-center mb-6">
          Use the link from your reset email to open this page, then choose a
          new password below.
        </p>
        <UpdatePasswordForm />
        <p className="text-center text-sm text-muted mt-6">
          <Link href="/login" className="text-accent hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
