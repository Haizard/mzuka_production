"use client";

import { useState } from "react";
import type { BookingStatusV2 } from "@prisma/client";
import { BOOKING_PIPELINE } from "@/lib/booking-constants";
import { updateBookingPipelineAction } from "../actions";

export function AdminBookingActions({
  bookingId,
  currentStatusV2,
}: {
  bookingId: string;
  currentStatusV2: BookingStatusV2;
}) {
  const [status, setStatus] = useState<BookingStatusV2>(currentStatusV2);
  const [saving, setSaving] = useState(false);

  const currentIdx = BOOKING_PIPELINE.findIndex((p) => p.value === status);

  const advance = async (newStatus: BookingStatusV2) => {
    setSaving(true);
    const res = await updateBookingPipelineAction(bookingId, newStatus);
    if (res.success) setStatus(newStatus);
    setSaving(false);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {BOOKING_PIPELINE.map((stage, i) => {
        const isActive = stage.value === status;
        const isPast   = i < currentIdx;
        return (
          <button
            key={stage.value}
            onClick={() => advance(stage.value as BookingStatusV2)}
            disabled={saving}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition disabled:opacity-50 ${
              isActive ? `${stage.colour} border-current bg-white/10` :
              isPast   ? "text-zinc-500 border-white/5 bg-white/3" :
              "text-zinc-500 border-white/10 hover:text-white hover:border-white/20"
            }`}
          >
            {stage.label}
          </button>
        );
      })}
    </div>
  );
}
