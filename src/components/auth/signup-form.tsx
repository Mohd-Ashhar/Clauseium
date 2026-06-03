"use client";

import { useActionState, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { FormStatus } from "./form-status";
import { SubmitButton } from "./submit-button";
import { signUpWithPassword } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";

type SignupFormProps = {
  next?: string;
};

export function SignupForm({ next }: SignupFormProps) {
  const [state, action] = useActionState(signUpWithPassword, initialFormState);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");

  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  const reqs = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains a number", met: /\d/.test(password) },
  ];

  return (
    <form action={action} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.status === "error" && state.formError ? (
        <FormStatus tone="error">{state.formError}</FormStatus>
      ) : null}
      {state.status === "success" && state.message ? (
        <FormStatus tone="success">{state.message}</FormStatus>
      ) : null}

      <FormField id="fullName" label="Full name" error={fieldErrors?.fullName?.[0]}>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          placeholder="Priya Menon"
          aria-invalid={Boolean(fieldErrors?.fullName)}
        />
      </FormField>

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
      >
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="••••••••"
            className="pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {reqs.map((r) => (
            <li
              key={r.label}
              className={cn(
                "inline-flex items-center gap-1.5 text-[11.5px] transition-colors",
                r.met ? "text-risk-low" : "text-ink-500",
              )}
            >
              <Check
                className={cn(
                  "h-3 w-3",
                  r.met ? "opacity-100" : "opacity-30",
                )}
              />
              {r.label}
            </li>
          ))}
        </ul>
      </FormField>

      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>

      <p className="text-[11px] leading-relaxed text-ink-500">
        By creating an account, you agree to our terms of service and privacy notice. Clauseium
        provides legal information and analysis — not a substitute for professional judgement.
      </p>
    </form>
  );
}
