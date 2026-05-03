"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { FormStatus } from "./form-status";
import { SubmitButton } from "./submit-button";
import { signInWithPassword } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";

type LoginFormProps = {
  next?: string;
};

export function LoginForm({ next }: LoginFormProps) {
  const [state, action] = useActionState(signInWithPassword, initialFormState);
  const [showPassword, setShowPassword] = useState(false);

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.status === "error" && state.formError ? (
        <FormStatus tone="error">{state.formError}</FormStatus>
      ) : null}

      <FormField id="email" label="Work email" error={fieldErrors?.email?.[0]}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@firm.com"
          aria-invalid={Boolean(fieldErrors?.email)}
        />
      </FormField>

      <FormField
        id="password"
        label="Password"
        error={fieldErrors?.password?.[0]}
        trailing={
          <Link
            href="/forgot-password"
            className="text-[12px] font-medium text-brand-400 hover:text-brand-300"
          >
            Forgot password?
          </Link>
        }
      >
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="pr-10"
            aria-invalid={Boolean(fieldErrors?.password)}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-500 hover:text-ink-300"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </FormField>

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
