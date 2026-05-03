import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sign-in failed",
};

export default function AuthCodeErrorPage() {
  return (
    <AuthCard
      title="We couldn't sign you in"
      description="The sign-in link may have expired or already been used. Try again, or use email and password."
    >
      <div className="flex flex-col gap-3">
        <Button asChild variant="primary" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
