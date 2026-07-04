"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Camera, Scissors,
} from "lucide-react";
import { getCalendarEvents } from "../actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = "SHOOTING" | "CULLING" | "EDITING" | "REVIEW" | "DELIVERED" | "ARCHIVED";

interface CalBooking {
  id: string;
  title: string;
  serviceType: string;
  scheduledAt: Date;
  status: string;
  client: { id: string; name: string };
  package: { name: string } | null;
  project: { id: string; stage: Stage } | null;
}

interface CalProject {
  id: string;
  shootDate: Date | null;
  editDueDate: Date | null;
  booking: { id: string; title: string; serviceType: string };
}

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  bookings: CalBooking[];
  shootDates: CalProject[];
  dueDates: CalProject[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month - 1, 1);
  const last  = new Date(year, month, 0);
  const cells: Date[] = [];

  // Pad start
  for (let i = first.getDay(); i > 0; i--) {
    cells.push(new Date(year, month - 1, 1 - i));
  }
  // Current month
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(year, month - 1, d));
  }
  // Pad end to complete last row
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push(new Date(year, month, i));
  }
  return cells;
}

function fmtTime(d: Date) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [bookings, setBookings]   = useState<CalBooking[]>([]);
  const [projects, setProjects]   = useState<CalProject[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getCalendarEvents(year, month);
    if (res.success) {
      setBookings((res.bookings ?? []) as unknown as CalBooking[]);
      setProjects((res.projects ?? []) as unknown as CalProject[]);
    }
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  const grid = buildGrid(year, month);

  // Build day cells
  const cells: DayCell[] = grid.map((date) => ({
    date,
    isCurrentMonth: date.getMonth() === month - 1,
    bookings: bookings.filter((b) => sameDay(new Date(b.scheduledAt), date)),
    shootDates: projects.filter((p) => p.shootDate && sameDay(new Date(p.shootDate), date)),
    dueDates: projects.filter((p) => p.editDueDate && sameDay(new Date(p.editDueDate), date)),
  }));

  // Selected day events
  const selectedCell = selected ? cells.find((c) => sameDay(c.date, selected)) : null;

  const today = new Date();

  return (
    <main className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Calendar</h2>
          <p className="mt-0.5 text-sm text-zinc-400">Sessions, shoot dates, and edit deadlines</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg border border-white/10 hover:bg-white/10 transition">
            <ChevronLeft className="h-4 w-4 text-zinc-400" />
          </button>
          <span className="text-sm font-semibold text-white min-w-[140px] text-center">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg border border-white/10 hover:bg-white/10 transition">
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          </button>
          <button
            onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }}
            className="ml-2 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-zinc-400 hover:text-white transition"
          >
            Today
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />Booking / Session</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-violet-500 inline-block" />Edit deadline</span>
      </div>

      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Calendar grid */}
        <div className="flex-1 rounded-lg border border-white/10 bg-[var(--surface)] overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-white/10">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-zinc-500 uppercase">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="py-20 text-center text-zinc-500">Loading…</div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((cell, i) => {
                const isToday = sameDay(cell.date, today);
                const isSelected = selected && sameDay(cell.date, selected);
                const hasEvents = cell.bookings.length > 0 || cell.shootDates.length > 0 || cell.dueDates.length > 0;

                return (
                  <div
                    key={i}
                    onClick={() => setSelected(cell.date)}
                    className={`min-h-[80px] p-1.5 border-b border-r border-white/5 cursor-pointer transition
                      ${!cell.isCurrentMonth ? "opacity-30" : ""}
                      ${isSelected ? "bg-[var(--gold)]/10" : "hover:bg-white/5"}
                    `}
                  >
                    <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1
                      ${isToday ? "bg-[var(--gold)] text-black" : "text-zinc-400"}`}>
                      {cell.date.getDate()}
                    </div>

                    {/* Event dots */}
                    <div className="space-y-0.5">
                      {cell.bookings.slice(0, 2).map((b) => (
                        <div key={b.id} className="truncate text-[10px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-300">
                          {fmtTime(b.scheduledAt)} {b.title}
                        </div>
                      ))}
                      {cell.bookings.length > 2 && (
                        <div className="text-[10px] text-zinc-500 px-1">+{cell.bookings.length - 2} more</div>
                      )}
                      {cell.dueDates.slice(0, 1).map((p) => (
                        <div key={p.id} className="truncate text-[10px] px-1 py-0.5 rounded bg-violet-500/20 text-violet-300">
                          ✂️ {p.booking.title}
                        </div>
                      ))}
                    </div>

                    {hasEvents && !cell.bookings.length && !cell.dueDates.length && (
                      <div className="mt-1 flex gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Day detail panel */}
        <div className="lg:w-72 rounded-lg border border-white/10 bg-[var(--surface)] p-4">
          {!selected ? (
            <div className="py-8 text-center text-zinc-500 text-sm">Click a day to see events</div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-white mb-4">
                {selected.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h3>

              {selectedCell && (selectedCell.bookings.length + selectedCell.shootDates.length + selectedCell.dueDates.length) === 0 && (
                <p className="text-sm text-zinc-500">No events</p>
              )}

              {/* Bookings */}
              {selectedCell?.bookings.map((b) => (
                <Link key={b.id} href={b.project ? `/admin/production/${b.project.id}` : `/admin/bookings/${b.id}`}
                  className="block mb-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition">
                  <div className="flex items-center gap-2 mb-1">
                    <Camera className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs font-semibold text-blue-300">{fmtTime(b.scheduledAt)}</span>
                  </div>
                  <p className="text-sm font-medium text-white">{b.title}</p>
                  <p className="text-xs text-zinc-400">{b.client.name} · {b.serviceType}</p>
                  {b.project && (
                    <span className="text-xs text-blue-400 mt-1 block">{b.project.stage}</span>
                  )}
                </Link>
              ))}

              {/* Shoot dates */}
              {selectedCell?.shootDates.map((p) => (
                <Link key={`shoot-${p.id}`} href={`/admin/production/${p.id}`}
                  className="block mb-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition">
                  <div className="flex items-center gap-2 mb-1">
                    <Camera className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-300">Shoot Day</span>
                  </div>
                  <p className="text-sm text-white">{p.booking.title}</p>
                </Link>
              ))}

              {/* Edit due dates */}
              {selectedCell?.dueDates.map((p) => (
                <Link key={`due-${p.id}`} href={`/admin/production/${p.id}`}
                  className="block mb-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 hover:border-violet-500/40 transition">
                  <div className="flex items-center gap-2 mb-1">
                    <Scissors className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-xs font-semibold text-violet-300">Edit Deadline</span>
                  </div>
                  <p className="text-sm text-white">{p.booking.title}</p>
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
