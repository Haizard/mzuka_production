"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toggleProductionManagerAction } from "@/app/admin/equipment/actions";

export function EmployeeActions({
  staffId,
  isProductionManager,
}: {
  staffId: string;
  isProductionManager: boolean;
}) {
  const [isPM, setIsPM] = useState(isProductionManager);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    const next = !isPM;
    const res = await toggleProductionManagerAction(staffId, next);
    if (res.success) setIsPM(next);
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-violet-400" />
        <p className="text-xs text-zinc-300">Production Manager</p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${isPM ? "bg-violet-600" : "bg-zinc-700"}`}
      >
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPM ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
