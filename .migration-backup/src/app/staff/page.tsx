"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckSquare, Square, Clock, Package, Upload, ArrowDownToLine,
  RefreshCw, Loader2, AlertTriangle, CheckCircle2,
} from "lucide-react";
import type { TaskStatus } from "@prisma/client";
import { getMyTasksAction, submitReturnRequestAction, getStaffUploadUrlAction, confirmStaffUploadAction } from "@/app/admin/equipment/actions";

interface EquipmentAssignment {
  id: string;
  assignedAt: Date;
  item: { id: string; name: string; serialNumber: string | null; category: { name: string } };
  returns: { id: string }[];
}

interface Task {
  id: string; title: string; description: string | null;
  status: TaskStatus; dueAt: Date | null;
  project: {
    booking: {
      title: string;
      client: { name: string };
      gallery: { id: string } | null;
    };
  };
  equipmentAssignments: EquipmentAssignment[];
}

const STATUS_COLOUR: Record<TaskStatus, string> = {
  TODO:        "text-zinc-400 bg-zinc-700/50",
  IN_PROGRESS: "text-amber-300 bg-amber-500/10",
  DONE:        "text-emerald-300 bg-emerald-500/10",
};

function fmt(d: Date | string | null) {
  if (!d) return "No due date";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function StaffDashboard() {
  const [tasks, setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]       = useState<{ text: string; ok: boolean } | null>(null);
  const [uploadingTask, setUploadingTask] = useState<string | null>(null);
  const [returningEq, setReturningEq]    = useState<string | null>(null);
  const [returnNote, setReturnNote]      = useState("");
  const [returnAssId, setReturnAssId]    = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getMyTasksAction();
    if (res.success) setTasks(res.tasks as unknown as Task[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
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

  return (
    <main className="min-h-dvh bg-[var(--background)] text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Staff Portal</p>
            <h1 className="text-2xl font-bold text-white mt-1">My Tasks</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Your assigned work, equipment, and media uploads</p>
          </div>
          <button onClick={load} className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white transition">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {msg && (
          <div className={`mb-6 rounded-lg border px-4 py-2.5 text-sm flex items-center gap-2 ${msg.ok ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-red-500/20 bg-red-500/10 text-red-300"}`}>
            {msg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            {msg.text}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-zinc-500">Loading your tasks…</div>
        ) : tasks.length === 0 ? (
          <div className="py-20 text-center rounded-lg border border-white/10 bg-[var(--surface)]">
            <CheckSquare className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400">No tasks assigned to you yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => {
              const canSubmit = task.status !== "DONE";
              const hasGallery = !!task.project.booking.gallery;

              return (
                <div key={task.id} className="rounded-xl border border-white/10 bg-[var(--surface)] overflow-hidden">
                  {/* Task header */}
                  <div className="p-5 border-b border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {task.status === "DONE"
                            ? <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                            : task.status === "IN_PROGRESS"
                            ? <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                            : <Square className="h-4 w-4 text-zinc-500 shrink-0" />
                          }
                          <p className="font-semibold text-white">{task.title}</p>
                        </div>
                        <p className="text-sm text-zinc-400">
                          {task.project.booking.title} · {task.project.booking.client.name}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOUR[task.status]}`}>
                            {task.status.replace("_"," ")}
                          </span>
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {fmt(task.dueAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {task.description && (
                      <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{task.description}</p>
                    )}
                  </div>

                  {/* Equipment */}
                  {task.equipmentAssignments.length > 0 && (
                    <div className="px-5 py-4 border-b border-white/10">
                      <p className="text-xs text-zinc-500 uppercase mb-3 flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5" /> Equipment Assigned ({task.equipmentAssignments.length})
                      </p>
                      <div className="space-y-2">
                        {task.equipmentAssignments.map((ass) => {
                          const hasPendingReturn = ass.returns.length > 0;
                          return (
                            <div key={ass.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                              <div>
                                <p className="text-sm font-medium text-white">{ass.item.name}</p>
                                <p className="text-xs text-zinc-500">
                                  {ass.item.category.name}
                                  {ass.item.serialNumber && ` · SN: ${ass.item.serialNumber}`}
                                  {" · "}Assigned {fmt(ass.assignedAt)}
                                </p>
                              </div>
                              {canSubmit && !hasPendingReturn && (
                                <button
                                  onClick={() => { setReturnAssId(ass.id); setReturnNote(""); }}
                                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition"
                                >
                                  <ArrowDownToLine className="h-3.5 w-3.5" /> Return
                                </button>
                              )}
                              {hasPendingReturn && (
                                <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-300">
                                  Return pending
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
                    <div className="px-5 py-4">
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
                              <p className="text-sm text-white font-medium">
                                {uploadingTask === task.id ? "Uploading…" : "Upload photos or videos"}
                              </p>
                              <p className="text-xs text-zinc-500">jpg, png, webp, mp4, mov — goes to client gallery as draft</p>
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

        {/* Return request modal */}
        {returnAssId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--surface)] p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Submit Equipment Return</h3>
              <p className="text-sm text-zinc-400 mb-4">
                Submit a return request. The production manager will review and approve it.
              </p>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Condition note (optional)</label>
                <textarea value={returnNote} onChange={(e) => setReturnNote(e.target.value)} rows={3}
                  placeholder="Describe the condition of the item…" maxLength={500}
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)] resize-none" />
                <p className="text-xs text-zinc-600 mt-1 text-right">{returnNote.length}/500</p>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => { setReturnAssId(null); setReturnNote(""); }}
                  className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">Cancel</button>
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
