import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { FormStatus } from "@/components/auth/form-status";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Clauseium workspace.",
};

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next, error } = await searchParams;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to continue reviewing contracts."
      footer={
        <>
          New to Clauseium?{" "}
          <Link href="/signup" className="font-medium text-brand-400 hover:text-brand-300">
            Create an account
          </Link>
        </>
      }
    >
      {error ? (
        <div className="mb-4">
          <FormStatus tone="error">{error}</FormStatus>
        </div>
      ) : null}
      <GoogleButton next={next} />
      <AuthDivider />
      <LoginForm next={next} />
    </AuthCard>
  );
}
