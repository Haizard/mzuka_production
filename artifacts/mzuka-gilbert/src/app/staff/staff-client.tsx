"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckSquare, Square, Clock, Package, Upload, ArrowDownToLine,
  RefreshCw, Loader2, AlertTriangle, CheckCircle2,
  Camera, Video, Scissors, Car, Users2, Star,
} from "lucide-react";import type { TaskStatus } from "@prisma/client";
import {
  getMyTasksAction,
  submitReturnRequestAction,
  getStaffUploadUrlAction,
  confirmStaffUploadAction,
} from "@/app/admin/equipment/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EquipmentAssignment {
  id: string;
  assignedAt: Date;
  item: { id: string; name: string; serialNumber: string | null; category: { name: string } };
  returns: { id: string }[];
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: Date | null;
  project: {
    booking: {
      title: string;
      client: { name: string };
      gallery: { id: string } | null;
    };
  };
  equipmentAssignments: EquipmentAssignment[];
}

// ── Role metadata ─────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { label: string; icon: React.ElementType; colour: string; desc: string }> = {
  PHOTOGRAPHER:  { label: "Photographer",  icon: Camera,   colour: "text-blue-400",   desc: "Capture and upload photos to client galleries" },
  VIDEO_EDITOR:  { label: "Video Editor",  icon: Video,    colour: "text-cyan-400",   desc: "Edit videos and upload to client galleries" },
  EDITOR:        { label: "Photo Editor",  icon: Scissors, colour: "text-indigo-400", desc: "Retouch and finalise edited photos" },
  DRIVER:        { label: "Driver",        icon: Car,      colour: "text-amber-400",  desc: "Transport crew and equipment to shoots" },
  ASSISTANT:     { label: "Assistant",     icon: Users2,   colour: "text-zinc-400",   desc: "Support the production team on location" },
};

const STATUS_COLOUR: Record<TaskStatus, string> = {
  TODO:        "text-zinc-400 bg-zinc-700/50",
  IN_PROGRESS: "text-amber-300 bg-amber-500/10",
  DONE:        "text-emerald-300 bg-emerald-500/10",
};

function fmt(d: Date | string | null) {
  if (!d) return "No due date";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  userName: string;
  staffRole: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StaffDashboardClient({ userName, staffRole }: Props) {
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState<{ text: string; ok: boolean } | null>(null);
  const [uploadingTask, setUploadingTask] = useState<string | null>(null);
  const [returningEq, setReturningEq]    = useState<string | null>(null);
  const [returnNote, setReturnNote]      = useState("");
  const [returnAssId, setReturnAssId]    = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const meta = staffRole ? (ROLE_META[staffRole] ?? null) : null;
  const RoleIcon = meta?.icon ?? Star;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getMyTasksAction();
    if (res.success) setTasks(res.tasks as unknown as Task[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => { void load(); }, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleUpload = async (taskId: string, file: File) => {
    setUploadingTask(taskId);
    try {
      const urlRes = await getStaffUploadUrlAction({ taskId, filename: file.name, mimeType: file.type, sizeBytes: file.size });
      if (!urlRes.success || !urlRes.uploadUrl) { flash(urlRes.error ?? "Failed to prepare upload", false); return; }
      const s3Res = await fetch(urlRes.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!s3Res.ok) { flash("Upload to storage failed. Please try again.", false); return; }
      await confirmStaffUploadAction(urlRes.mediaAssetId!, taskId);
      flash(`✓ ${file.name} uploaded to gallery`);
      load();
    } catch (e) {
      console.error("Staff upload error:", e);
      flash("Upload failed. Please try again.", false);
    } finally {
      setUploadingTask(null);
    }
  };

  const submitReturn = async () => {
    if (!returnAssId) return;
    setReturningEq(returnAssId);
    const res = await submitReturnRequestAction({ assignmentId: returnAssId, returnNote: returnNote || undefined });
    if (res.success) { flash("Return request submitted"); setReturnAssId(null); setReturnNote(""); load(); }
    else flash(res.error ?? "Failed", false);
    setReturningEq(null);
  };

  // ── Counts ──────────────────────────────────────────────────────────────────
  const active    = tasks.filter((t) => t.status !== "DONE").length;
  const done      = tasks.filter((t) => t.status === "DONE").length;
  const inProg    = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const totalEquip = tasks.reduce((n, t) => n + t.equipmentAssignments.length, 0);

  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">

        {/* ── Welcome header ── */}
        <div className="mb-6 rounded-xl border border-white/10 bg-[var(--surface)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Staff Portal</p>
              <h1 className="text-xl font-bold text-[var(--foreground)]">
                Welcome back, {userName.split(" ")[0]}
              </h1>
              {meta && (
                <div className={`mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium ${meta.colour}`}>
                  <RoleIcon className="h-4 w-4" />
                  {meta.label}
                </div>
              )}
              {meta && <p className="text-xs text-zinc-500 mt-1">{meta.desc}</p>}
            </div>
            <button onClick={load} disabled={loading}
              className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white transition disabled:opacity-50 shrink-0">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Stats row */}
          {!loading && tasks.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-4 gap-3">
              {[
                { label: "Active",      value: active,     colour: "text-amber-400" },
                { label: "In Progress", value: inProg,     colour: "text-blue-400" },
                { label: "Done",        value: done,       colour: "text-emerald-400" },
                { label: "Equipment",   value: totalEquip, colour: "text-[var(--gold)]" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={`text-xl font-bold ${s.colour}`}>{s.value}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Flash message ── */}
        {msg && (
          <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm flex items-center gap-2 ${msg.ok ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-red-500/20 bg-red-500/10 text-red-300"}`}>
            {msg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            {msg.text}
          </div>
        )}

        {/* ── Tasks ── */}
        {loading ? (
          <div className="py-20 text-center text-zinc-500">Loading your tasks…</div>
        ) : tasks.length === 0 ? (
          <div className="py-20 text-center rounded-xl border border-white/10 bg-[var(--surface)]">
            <CheckSquare className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">No tasks assigned to you yet</p>
            <p className="text-sm text-zinc-600 mt-1">Tasks will appear here once a production manager assigns them to you.</p>
            <button onClick={load}
              className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">
              <RefreshCw className="h-4 w-4" /> Check again
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Section label */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                My Tasks ({tasks.length})
              </h2>
            </div>

            {tasks.map((task) => {
              const canSubmit = task.status !== "DONE";
              const hasGallery = !!task.project.booking.gallery;

              return (
                <div key={task.id} className="rounded-xl border border-white/10 bg-[var(--surface)] overflow-hidden">
                  {/* Task header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {task.status === "DONE"
                            ? <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                            : task.status === "IN_PROGRESS"
                            ? <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                            : <Square className="h-4 w-4 text-zinc-500 shrink-0" />
                          }
                          <p className="font-semibold text-[var(--foreground)]">{task.title}</p>
                        </div>
                        <p className="text-sm text-zinc-400">
                          {task.project.booking.title}
                          <span className="text-zinc-600"> · {task.project.booking.client.name}</span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOUR[task.status]}`}>
                            {task.status.replace("_", " ")}
                          </span>
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {fmt(task.dueAt)}
                          </span>
                          {task.equipmentAssignments.length > 0 && (
                            <span className="text-xs text-[var(--gold)] flex items-center gap-1">
                              <Package className="h-3 w-3" /> {task.equipmentAssignments.length} equipment
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-sm text-zinc-400 mt-3 leading-relaxed border-t border-white/5 pt-3">{task.description}</p>
                    )}
                  </div>

                  {/* Equipment assigned */}
                  {task.equipmentAssignments.length > 0 && (
                    <div className="px-5 py-4 border-t border-white/10 bg-white/2">
                      <p className="text-xs text-zinc-500 uppercase mb-3 flex items-center gap-1.5 font-medium">
                        <Package className="h-3.5 w-3.5 text-[var(--gold)]" />
                        Equipment Assigned ({task.equipmentAssignments.length})
                      </p>
                      <div className="space-y-2">
                        {task.equipmentAssignments.map((ass) => {
                          const hasPendingReturn = ass.returns.length > 0;
                          return (
                            <div key={ass.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[var(--foreground)]">{ass.item.name}</p>
                                <p className="text-xs text-zinc-500">
                                  {ass.item.category.name}
                                  {ass.item.serialNumber && ` · SN: ${ass.item.serialNumber}`}
                                  {" · "}<span className="text-zinc-600">Since {fmt(ass.assignedAt)}</span>
                                </p>
                              </div>
                              {canSubmit && !hasPendingReturn ? (
                                <button
                                  onClick={() => { setReturnAssId(ass.id); setReturnNote(""); }}
                                  className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition ml-3"
                                >
                                  <ArrowDownToLine className="h-3.5 w-3.5" /> Return
                                </button>
                              ) : hasPendingReturn ? (
                                <span className="shrink-0 ml-3 text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-300">
                                  Return pending
                                </span>
                              ) : (
                                <span className="shrink-0 ml-3 text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                                  Returned
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Media upload */}
                  {canSubmit && (
                    <div className="px-5 py-4 border-t border-white/10">
                      {!hasGallery ? (
                        <div className="flex items-center gap-2 text-xs text-amber-400">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          No gallery yet — ask admin to create one for this booking
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            key={`file-${task.id}`}
                            type="file"
                            ref={(el) => { fileInputRefs.current[task.id] = el; }}
                            accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/quicktime"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (file) handleUpload(task.id, file);
                            }}
                            disabled={uploadingTask === task.id}
                            className="hidden"
                          />
                          <div className={`flex items-center gap-3 rounded-lg border border-dashed p-3 transition ${
                            uploadingTask === task.id
                              ? "border-[var(--gold)]/40 bg-[var(--gold)]/5"
                              : "border-white/10 hover:border-[var(--gold)]/30 hover:bg-[var(--gold)]/5"
                          }`}>
                            {uploadingTask === task.id ? (
                              <Loader2 className="h-5 w-5 text-[var(--gold)] animate-spin shrink-0" />
                            ) : (
                              <Upload className="h-5 w-5 text-zinc-500 shrink-0" />
                            )}
                            <div>
                              <p className="text-sm text-[var(--foreground)] font-medium">
                                {uploadingTask === task.id ? "Uploading…" : "Upload photos or videos"}
                              </p>
                              <p className="text-xs text-zinc-500">jpg, png, webp, mp4, mov · saved to client gallery as draft</p>
                            </div>
                          </div>
                        </label>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Return request modal ── */}
        {returnAssId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--surface)] p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Submit Equipment Return</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Submit a return request. The production manager will review and approve it.
              </p>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Condition note (optional)</label>
                <textarea value={returnNote} onChange={(e) => setReturnNote(e.target.value)} rows={3}
                  placeholder="Describe the condition of the item…" maxLength={500}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--gold)] resize-none" />
                <p className="text-xs text-zinc-600 mt-1 text-right">{returnNote.length}/500</p>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => { setReturnAssId(null); setReturnNote(""); }}
                  className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">
                  Cancel
                </button>
                <button onClick={submitReturn} disabled={returningEq === returnAssId}
                  className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-400 disabled:opacity-50 transition">
                  {returningEq === returnAssId ? "Submitting…" : "Submit Return Request"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
// (all imported from lucide-react above)
