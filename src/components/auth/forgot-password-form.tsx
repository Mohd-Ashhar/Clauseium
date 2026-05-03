"use client";

import { useActionState } from "react";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { FormStatus } from "./form-status";
import { SubmitButton } from "./submit-button";
import { requestPasswordReset } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/auth/form-state";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initialFormState);
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.status === "error" && state.formError ? (
        <FormStatus tone="error">{state.formError}</FormStatus>
      ) : null}
      {state.status === "success" && state.message ? (
        <FormStatus tone="success">{state.message}</FormStatus>
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

      <SubmitButton className="w-full" pendingLabel="Sending reset link…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
