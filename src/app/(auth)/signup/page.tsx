import Link from "next/link";
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { GoogleButton } from "@/components/auth/google-button";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Start your 14-day Clauseium trial.",
};

type SearchParams = Promise<{ next?: string }>;

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;

  return (
    <AuthCard
      title="Create your account"
      description="Start your 14-day trial. No credit card required."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-counsel-400 hover:text-counsel-300">
            Sign in
          </Link>
        </>
      }
    >
      <GoogleButton next={next} label="Sign up with Google" />
      <AuthDivider />
      <SignupForm next={next} />
    </AuthCard>
  );
}
