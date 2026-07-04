"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Camera, Scissors, Eye, PackageCheck, Archive, Film,
  Plus, Trash2, CheckSquare, Square, UserPlus, UserMinus,
  MessageSquare, Clock, RefreshCw, ChevronDown, Package,
} from "lucide-react";
import {
  getProjectById,
  updateProjectStageAction,
  createTaskAction,
  updateTaskStatusAction,
  deleteTaskAction,
  addNoteAction,
  deleteNoteAction,
  assignStaffAction,
  removeStaffAssignmentAction,
  getStaffMembers,
} from "../actions";
import { assignEquipmentAction, getTaskEquipmentAction, getEquipmentItemsAction } from "@/app/admin/equipment/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = "SHOOTING" | "CULLING" | "EDITING" | "REVIEW" | "DELIVERED" | "ARCHIVED";
type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

interface EquipAssignment {
  id: string; assignedAt: Date;
  item: { id: string; name: string; serialNumber: string | null; category: { name: string } };
}
interface Task { id: string; title: string; description: string | null; status: TaskStatus; dueAt: Date | null; assignee: { id: string; name: string } | null }
interface Note { id: string; body: string; createdAt: Date; author: { id: string; name: string; role: string } }
interface Assignment { id: string; role: string; staff: { id: string; name: string; email: string; role: string } }
interface Comm { id: string; channel: string; subject: string; body: string; sentAt: Date | null; createdAt: Date; user: { id: string; name: string } }
interface StaffMember { id: string; name: string; email: string; role: string }
interface EquipItem { id: string; name: string; category: { name: string }; status: string }
interface Project {
  id: string; stage: Stage; shootDate: Date | null; editDueDate: Date | null; deliveredAt: Date | null; notes: string | null;
  booking: { id: string; title: string; serviceType: string; scheduledAt: Date; location: string | null; client: { id: string; name: string; email: string; phone: string | null }; package: { name: string; priceCents: number } | null; payments: { status: string; amountCents: number }[]; gallery: { id: string; mediaAssets: { id: string }[] } | null };
  tasks: Task[]; assignments: Assignment[]; internalNotes: Note[]; communications: Comm[];
}

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGES: { value: Stage; label: string; icon: React.ElementType }[] = [
  { value: "SHOOTING",  label: "Shooting",  icon: Camera },
  { value: "CULLING",   label: "Culling",   icon: Film },
  { value: "EDITING",   label: "Editing",   icon: Scissors },
  { value: "REVIEW",    label: "Review",    icon: Eye },
  { value: "DELIVERED", label: "Delivered", icon: PackageCheck },
  { value: "ARCHIVED",  label: "Archived",  icon: Archive },
];

const stageBg: Record<Stage, string> = {
  SHOOTING: "bg-blue-500", CULLING: "bg-yellow-500", EDITING: "bg-violet-500",
  REVIEW: "bg-amber-500", DELIVERED: "bg-emerald-500", ARCHIVED: "bg-zinc-600",
};

function fmt(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "tasks" | "notes" | "comms">("overview");

  // Form states
  const [newTask, setNewTask] = useState({ title: "", dueAt: "", assigneeId: "" });
  const [newNote, setNewNote] = useState("");
  const [assignRole, setAssignRole] = useState("Photographer");
  const [assignStaffId, setAssignStaffId] = useState("");
  const [stageLoading, setStageLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Equipment state
  const [equipItems, setEquipItems]   = useState<EquipItem[]>([]);
  const [taskEquip, setTaskEquip]     = useState<Record<string, EquipAssignment[]>>({});
  const [assignEquipTaskId, setAssignEquipTaskId] = useState<string | null>(null);
  const [selectedEquipId, setSelectedEquipId]     = useState("");
  const [assigningEquip, setAssigningEquip]        = useState(false);
  const [equipMsg, setEquipMsg]                    = useState<string | null>(null);

  const load = useCallback(async () => {
    const [pRes, sRes, eRes] = await Promise.all([
      getProjectById(id),
      getStaffMembers(),
      getEquipmentItemsAction({ status: "AVAILABLE" }),
    ]);
    if (pRes.success && pRes.project) setProject(pRes.project as unknown as Project);
    if (sRes.success) setStaff(sRes.staff);
    if (eRes.success) setEquipItems(eRes.items as unknown as EquipItem[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const advanceStage = async (stage: Stage) => {
    setStageLoading(true);
    await updateProjectStageAction(id, stage);
    await load();
    setStageLoading(false);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    setSaving(true);
    await createTaskAction(id, { title: newTask.title, dueAt: newTask.dueAt || undefined, assigneeId: newTask.assigneeId || undefined });
    setNewTask({ title: "", dueAt: "", assigneeId: "" });
    await load();
    setSaving(false);
  };

  const toggleTask = async (taskId: string, current: TaskStatus) => {
    const next: TaskStatus = current === "DONE" ? "TODO" : current === "TODO" ? "IN_PROGRESS" : "DONE";
    await updateTaskStatusAction(taskId, next);
    await load();
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSaving(true);
    await addNoteAction(id, newNote);
    setNewNote("");
    await load();
    setSaving(false);
  };

  const doAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStaffId) return;
    setSaving(true);
    await assignStaffAction(id, assignStaffId, assignRole);
    setAssignStaffId("");
    await load();
    setSaving(false);
  };

  const loadTaskEquip = async (taskId: string) => {
    const res = await getTaskEquipmentAction(taskId);
    if (res.success) setTaskEquip((p) => ({ ...p, [taskId]: res.assignments as unknown as EquipAssignment[] }));
  };

  const assignEquip = async () => {
    if (!assignEquipTaskId || !selectedEquipId) return;
    setAssigningEquip(true);
    const res = await assignEquipmentAction({ taskId: assignEquipTaskId, itemId: selectedEquipId });
    if (res.success) {
      setEquipMsg("Equipment assigned");
      setAssignEquipTaskId(null);
      setSelectedEquipId("");
      await load();
      await loadTaskEquip(assignEquipTaskId);
    } else {
      setEquipMsg(res.error ?? "Failed to assign equipment");
    }
    setAssigningEquip(false);
    setTimeout(() => setEquipMsg(null), 3000);
  };

  if (loading) return <div className="py-20 text-center text-zinc-500">Loading project…</div>;
  if (!project) return <div className="py-20 text-center text-red-400">Project not found</div>;

  const isPaid = project.booking.payments.some((p) => p.status === "PAID");
  const stageIdx = STAGES.findIndex((s) => s.value === project.stage);

  return (
    <main className="space-y-6">
      {/* Back + header */}
      <div>
        <Link href="/admin/production" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition mb-4">
          <ArrowLeft className="h-4 w-4" /> All Projects
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--gold)] mb-1">Production Project</p>
            <h1 className="text-2xl font-bold text-white">{project.booking.title}</h1>
            <p className="text-sm text-zinc-400 mt-1">
              {project.booking.serviceType} · {project.booking.client.name} · {fmt(project.booking.scheduledAt)}
            </p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Pipeline strip */}
      <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-4">
        <p className="text-xs text-zinc-500 uppercase mb-3">Pipeline</p>
        <div className="flex items-center gap-1 flex-wrap">
          {STAGES.map((s, i) => {
            const isActive = s.value === project.stage;
            const isPast = i < stageIdx;
            return (
              <button
                key={s.value}
                onClick={() => advanceStage(s.value)}
                disabled={stageLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                  isActive ? `${stageBg[s.value]} text-black border-transparent` :
                  isPast ? "bg-white/5 text-zinc-400 border-white/10" :
                  "border-white/10 text-zinc-500 hover:text-white hover:border-white/20"
                }`}
              >
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {(["overview", "tasks", "notes", "comms"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition ${tab === t ? "border-[var(--gold)] text-[var(--gold)]" : "border-transparent text-zinc-400 hover:text-white"}`}>
            {t === "comms" ? "Communications" : t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Booking info */}
          <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white">Booking Details</h3>
            {[
              ["Client", `${project.booking.client.name} · ${project.booking.client.email}`],
              ["Phone", project.booking.client.phone ?? "—"],
              ["Service", project.booking.serviceType],
              ["Location", project.booking.location ?? "—"],
              ["Scheduled", fmt(project.booking.scheduledAt)],
              ["Package", project.booking.package?.name ?? "None"],
              ["Payment", isPaid ? "✓ Paid" : "Unpaid"],
              ["Gallery", project.booking.gallery ? `${project.booking.gallery.mediaAssets.length} assets` : "Not created"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-zinc-500">{label}</span>
                <span className="text-white text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* Production dates + staff */}
          <div className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white">Production Dates</h3>
              {[
                ["Shoot date", fmt(project.shootDate)],
                ["Edit due", fmt(project.editDueDate)],
                ["Delivered", fmt(project.deliveredAt)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-zinc-500">{label}</span>
                  <span className="text-white">{value}</span>
                </div>
              ))}
            </div>

            {/* Staff */}
            <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Staff Assigned</h3>
              {project.assignments.length === 0 ? (
                <p className="text-sm text-zinc-500">No staff assigned yet</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {project.assignments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-white">{a.staff.name}</span>
                        <span className="text-zinc-500 ml-2">· {a.role}</span>
                      </div>
                      <button onClick={async () => { await removeStaffAssignmentAction(a.id); load(); }}
                        className="text-zinc-600 hover:text-red-400 transition">
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={doAssign} className="flex gap-2 mt-3">
                <select value={assignStaffId} onChange={(e) => setAssignStaffId(e.target.value)}
                  className="flex-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs text-white focus:outline-none">
                  <option value="">Select staff…</option>
                  {staff.filter((s) => !project.assignments.find((a) => a.staff.id === s.id)).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <input value={assignRole} onChange={(e) => setAssignRole(e.target.value)} placeholder="Role"
                  className="w-28 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs text-white focus:outline-none" />
                <button type="submit" disabled={saving || !assignStaffId}
                  className="px-3 py-1.5 rounded-lg bg-[var(--gold)] text-black text-xs font-semibold disabled:opacity-50">
                  <UserPlus className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── TASKS ── */}
      {tab === "tasks" && (
        <div className="space-y-4">
          {/* Add task */}
          <form onSubmit={addTask} className="rounded-lg border border-white/10 bg-[var(--surface)] p-4 flex gap-3 flex-wrap">
            <input value={newTask.title} onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
              placeholder="New task…" required
              className="flex-1 min-w-[180px] rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
            <select value={newTask.assigneeId} onChange={(e) => setNewTask((p) => ({ ...p, assigneeId: e.target.value }))}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none">
              <option value="">Unassigned</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="datetime-local" value={newTask.dueAt} onChange={(e) => setNewTask((p) => ({ ...p, dueAt: e.target.value }))}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none" />
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold disabled:opacity-50">
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>

          {/* Task list */}
          {project.tasks.length === 0 ? (
            <p className="py-8 text-center text-zinc-500">No tasks yet</p>
          ) : (
            <div className="rounded-lg border border-white/10 bg-[var(--surface)] divide-y divide-white/5">
              {project.tasks.map((task) => (
                <div key={task.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleTask(task.id, task.status)} className="shrink-0">
                      {task.status === "DONE" ? (
                        <CheckSquare className="h-5 w-5 text-emerald-400" />
                      ) : task.status === "IN_PROGRESS" ? (
                        <ChevronDown className="h-5 w-5 text-amber-400" />
                      ) : (
                        <Square className="h-5 w-5 text-zinc-600" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === "DONE" ? "line-through text-zinc-500" : "text-white"}`}>
                        {task.title}
                      </p>
                      <div className="flex gap-3 text-xs text-zinc-500 mt-0.5">
                        {task.assignee && <span>👤 {task.assignee.name}</span>}
                        {task.dueAt && <span><Clock className="inline h-3 w-3 mr-0.5" />{fmt(task.dueAt)}</span>}
                        <span className={`capitalize ${task.status === "DONE" ? "text-emerald-500" : task.status === "IN_PROGRESS" ? "text-amber-500" : "text-zinc-500"}`}>
                          {task.status.replace("_", " ").toLowerCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Assign equipment button */}
                      {task.assignee && (
                        <button
                          onClick={() => { setAssignEquipTaskId(task.id); setSelectedEquipId(""); loadTaskEquip(task.id); }}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-[var(--gold)] hover:border-[var(--gold)]/30 transition"
                          title="Assign equipment to this task"
                        >
                          <Package className="h-3.5 w-3.5" /> Equip
                        </button>
                      )}
                      <button onClick={async () => { await deleteTaskAction(task.id); load(); }}
                        className="text-zinc-700 hover:text-red-400 transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Equipment assigned to this task */}
                  {taskEquip[task.id]?.length > 0 && (
                    <div className="mt-3 ml-9 space-y-1.5">
                      {taskEquip[task.id].map((ea) => (
                        <div key={ea.id} className="flex items-center gap-2 text-xs text-zinc-400 bg-white/5 rounded-lg px-3 py-1.5">
                          <Package className="h-3 w-3 text-[var(--gold)] shrink-0" />
                          <span className="font-medium text-zinc-300">{ea.item.name}</span>
                          <span className="text-zinc-600">· {ea.item.category.name}</span>
                          {ea.item.serialNumber && <span className="text-zinc-600">· SN:{ea.item.serialNumber}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Equipment flash message */}
          {equipMsg && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
              {equipMsg}
            </div>
          )}

          {/* Assign equipment modal */}
          {assignEquipTaskId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--surface)] p-6">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <Package className="h-5 w-5 text-[var(--gold)]" /> Assign Equipment
                </h3>
                <p className="text-sm text-zinc-400 mb-4">
                  Task: <span className="text-white">{project.tasks.find((t) => t.id === assignEquipTaskId)?.title}</span>
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">Available Equipment</label>
                    <select value={selectedEquipId} onChange={(e) => setSelectedEquipId(e.target.value)}
                      className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
                      <option value="">Select equipment…</option>
                      {equipItems.map((item) => (
                        <option key={item.id} value={item.id}>{item.name} ({item.category.name})</option>
                      ))}
                    </select>
                    {equipItems.length === 0 && (
                      <p className="text-xs text-amber-400 mt-1.5">No available equipment. Add items in Equipment Inventory.</p>
                    )}
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setAssignEquipTaskId(null)}
                      className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">Cancel</button>
                    <button onClick={assignEquip} disabled={!selectedEquipId || assigningEquip}
                      className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold disabled:opacity-50 transition">
                      {assigningEquip ? "Assigning…" : "Assign Equipment"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── NOTES ── */}
      {tab === "notes" && (
        <div className="space-y-4">
          <form onSubmit={addNote} className="flex gap-3">
            <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={3}
              placeholder="Add internal note…" required
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)] resize-none" />
            <button type="submit" disabled={saving}
              className="self-start px-4 py-2.5 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold disabled:opacity-50">
              Add
            </button>
          </form>

          {project.internalNotes.length === 0 ? (
            <p className="py-8 text-center text-zinc-500">No notes yet</p>
          ) : (
            <div className="space-y-3">
              {project.internalNotes.map((note) => (
                <div key={note.id} className="rounded-lg border border-white/10 bg-[var(--surface)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-500">{note.author.name} · {fmt(note.createdAt)}</span>
                    <button onClick={async () => { await deleteNoteAction(note.id); load(); }}
                      className="text-zinc-700 hover:text-red-400 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap">{note.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COMMUNICATIONS ── */}
      {tab === "comms" && (
        <div className="space-y-3">
          {project.communications.length === 0 ? (
            <div className="py-12 text-center rounded-lg border border-white/10 bg-[var(--surface)]">
              <MessageSquare className="h-8 w-8 mx-auto text-zinc-700 mb-3" />
              <p className="text-zinc-500">No communications logged yet</p>
              <p className="text-xs text-zinc-600 mt-1">Messages sent to this client appear here automatically</p>
            </div>
          ) : (
            project.communications.map((comm) => (
              <div key={comm.id} className="rounded-lg border border-white/10 bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${comm.channel === "email" ? "bg-blue-500/15 text-blue-300" : comm.channel === "sms" ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-700/60 text-zinc-400"}`}>
                      {comm.channel.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-white">{comm.subject}</span>
                  </div>
                  <span className="text-xs text-zinc-500">{fmt(comm.sentAt ?? comm.createdAt)}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">To: {comm.user.name}</p>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}
