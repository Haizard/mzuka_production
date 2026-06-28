"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { loginAction, type AuthActionState } from "@/app/(auth)/actions";

const initialState: AuthActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="space-y-4">
      {/* Google sign-in */}
      <a
        href="/api/auth/google"
        className="flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white hover:bg-white/10 hover:border-white/20 transition"
      >
        <GoogleIcon />
        Continue with Google
      </a>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-zinc-500">or sign in with email</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form action={formAction} className="space-y-4">
        <Field label="Email" name="email" type="email" />
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
          <LockKeyhole className="h-4 w-4" />
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type,
}: Readonly<{
  label: string;
  name: string;
  type: string;
}>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-200">{label}</span>
      <input
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-black/45 px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[var(--gold)]"
        name={name}
        required
        type={type}
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"/>
    </svg>
  );
}
