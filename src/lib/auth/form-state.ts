export type FieldErrors = Record<string, string[] | undefined>;

export type FormState =
  | { status: "idle" }
  | { status: "error"; formError?: string; fieldErrors?: FieldErrors }
  | { status: "success"; message?: string };

export const initialFormState: FormState = { status: "idle" };

export type OAuthResult =
  | { ok: true; url: string }
  | { ok: false; error: string };
