"use client";

import { Download, Printer } from "lucide-react";

interface Props {
  paymentId: string;
  label?: string;
  variant?: "full" | "icon";
}

export function ReceiptBtn({ paymentId, label = "Receipt", variant = "full" }: Props) {
  const url = `/api/receipt/${paymentId}`;

  if (variant === "icon") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="View / print receipt"
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-[var(--gold)] hover:border-[var(--gold)]/30 transition"
      >
        <Printer className="h-3.5 w-3.5" />
      </a>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-zinc-300 hover:text-white hover:border-[var(--gold)]/40 transition"
      >
        <Printer className="h-3.5 w-3.5" />
        {label}
      </a>
      <a
        href={`${url}?download=1`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-zinc-400 hover:text-[var(--gold)] hover:border-[var(--gold)]/30 transition"
        title="Download receipt"
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
