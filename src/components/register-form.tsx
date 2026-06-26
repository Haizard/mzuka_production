"use client";

import { useActionState } from "react";
import { UserCheck } from "lucide-react";
import { registerAction, type AuthActionState } from "@/app/(auth)/actions";

const initialState: AuthActionState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Full name" name="name" type="text" />
      <Field label="Email" name="email" type="email" />
      <Field label="Phone" name="phone" required={false} type="tel" />
      <Field label="Password" name="password" type="password" />

      {state.error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}

      <button
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-4 text-sm font-semibold text-black transition hover:bg-[#e6c65a] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        <UserCheck className="h-4 w-4" />
        {pending ? "Creating account..." : "Request private access"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  required = true,
  type,
}: Readonly<{
  label: string;
  name: string;
  required?: boolean;
  type: string;
}>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-200">{label}</span>
      <input
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-black/45 px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--gold)]"
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}
