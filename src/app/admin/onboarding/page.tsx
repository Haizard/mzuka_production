"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ClipboardCheck, Loader2, CheckCircle2, Plus, X, Trash2,
  ChevronDown, ChevronUp, User, ListChecks, Search,
} from "lucide-react";
import {
  getOnboardingSummary, getOnboardingData, createOnboardingTasks, toggleTaskStatus, deleteOnboardingTask, resetStaffOnboarding,
} from "./actions";

interface OnboardingStaff {
  id: string;
  name: string;
  staffRole: string | null;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  progress: number;
  onboardingTasks: { id: string; status: string }[];
}

interface TaskDetail {
  id: string;
  staffId: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  completedAt: string | null;
  createdAt: string;
  staff: { id: string; name: string };
}

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "admin", label: "Admin" },
  { value: "safety", label: "Safety" },
  { value: "tools", label: "Tools & Software" },
  { value: "policies", label: "Policies" },
  { value: "training", label: "Training" },
];

const DEFAULT_TASKS = [
  { title: "Read the employee handbook", category: "policies", description: "Review company policies and code of conduct" },
  { title: "Complete safety training", category: "safety", description: "Online safety and equipment handling course" },
  { title: "Set up work email and tools", category: "tools", description: "Email, Slack, project management tools access" },
  { title: "Meet the team", category: "general", description: "Introduction meetings with team leads and members" },
  { title: "Review role responsibilities", category: "admin", description: "Detailed walkthrough of role expectations and KPIs" },
  { title: "Equipment check-out", category: "general", description: "Receive and register assigned equipment" },
  { title: "First project walkthrough", category: "training", description: "Shadow an experienced team member on a live project" },
];

function roleLabel(role: string | null) {
  const roles: Record<string, string> = {
    ADMIN: "Admin", PRODUCTION_MANAGER: "Production Manager", PHOTOGRAPHER: "Photographer",
    VIDEO_EDITOR: "Video Editor", EDITOR: "Photo Editor", COORDINATOR: "Coordinator",
    DRIVER: "Driver", ASSISTANT: "Assistant", HUMAN_RESOURCE: "Human Resource",
  };
  return roles[role ?? ""] ?? role ?? "Staff";
}

function ProgressRing({ progress }: { progress: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (progress / 100) * c;
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={progress === 100 ? "#34d399" : "#d4af37"} strokeWidth="4" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{progress}%</span>
    </div>
  );
}

export default function OnboardingPage() {
  const [staff, setStaff] = useState<OnboardingStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getOnboardingSummary();
    if (data.success && data.summary) setStaff(data.summary as OnboardingStaff[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadTasks = async (staffId: string) => {
    const data = await getOnboardingData(staffId);
    if (data.success) setTasks(data.tasks as TaskDetail[]);
  };

  const handleSelect = async (staffId: string) => {
    setSelectedStaff(staffId === selectedStaff ? null : staffId);
    setExpanded(null);
    if (staffId !== selectedStaff) {
      await loadTasks(staffId);
    }
  };

  const handleToggle = async (taskId: string, currentStatus: string) => {
    setActionLoading(taskId);
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    const res = await toggleTaskStatus(taskId, newStatus);
    if (res.success) {
      await loadTasks(selectedStaff!);
      await loadData();
    }
    setActionLoading(null);
  };

  const handleCreateTask = async () => {
    if (!selectedStaff || !newTitle.trim()) return;
    setActionLoading("create");
    const res = await createOnboardingTasks(selectedStaff, [{
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      category: newCategory,
    }]);
    if (res.success) {
      flash("Task added");
      setShowCreate(false);
      setNewTitle("");
      setNewDesc("");
      setNewCategory("general");
      await loadTasks(selectedStaff);
      await loadData();
    }
    setActionLoading(null);
  };

  const handleBulkCreate = async () => {
    if (!selectedStaff) return;
    setActionLoading("bulk");
    const res = await createOnboardingTasks(selectedStaff, DEFAULT_TASKS);
    if (res.success) {
      flash(`Added ${DEFAULT_TASKS.length} default onboarding tasks`);
      await loadTasks(selectedStaff);
      await loadData();
    }
    setActionLoading(null);
  };

  const handleDelete = async (taskId: string) => {
    setActionLoading(taskId + "del");
    const res = await deleteOnboardingTask(taskId);
    if (res.success) {
      await loadTasks(selectedStaff!);
      await loadData();
    }
    setActionLoading(null);
  };

  const handleReset = async () => {
    if (!selectedStaff) return;
    if (!confirm("Reset all onboarding tasks for this staff member?")) return;
    setActionLoading("reset");
    const res = await resetStaffOnboarding(selectedStaff);
    if (res.success) {
      flash("Onboarding reset");
      await loadTasks(selectedStaff);
      await loadData();
    }
    setActionLoading(null);
  };

  const filteredStaff = staff.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.staffRole && s.staffRole.toLowerCase().includes(q));
    }
    return true;
  });

  const totalAllTasks = staff.reduce((sum, s) => sum + s.totalTasks, 0);
  const completedAllTasks = staff.reduce((sum, s) => sum + s.completedTasks, 0);

  return (
    <main className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Human Resources</p>
        <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-[var(--gold)]" />
          Onboarding Checklists
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Track and manage new hire onboarding tasks</p>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex items-center gap-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}
        </div>
      )}

      {/* Global stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Staff", value: staff.length, colour: "text-blue-400" },
          { label: "Tasks Created", value: totalAllTasks, colour: "text-violet-400" },
          { label: "Tasks Completed", value: completedAllTasks, colour: "text-emerald-400" },
          { label: "Completion Rate", value: totalAllTasks > 0 ? `${Math.round((completedAllTasks / totalAllTasks) * 100)}%` : "—", colour: "text-[var(--gold)]" },
        ].map(({ label, value, colour }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
            <p className={`text-2xl font-bold ${colour}`}>{value}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or role…"
          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--gold)]"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-12 text-center text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStaff.map((s) => {
            const isSelected = selectedStaff === s.id;
            return (
              <div key={s.id} className={`rounded-xl border bg-[var(--surface)] transition ${
                isSelected ? "border-[var(--gold)]/40" : "border-white/10"
              }`}>
                {/* Staff row */}
                <button
                  onClick={() => handleSelect(s.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <ProgressRing progress={s.progress} />
                    <div>
                      <p className="text-sm font-semibold text-white">{s.name}</p>
                      <p className="text-xs text-zinc-500">{roleLabel(s.staffRole)} · {s.totalTasks} task{s.totalTasks !== 1 ? "s" : ""}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-emerald-400">{s.completedTasks} completed</span>
                        <span className="text-[10px] text-amber-400">{s.pendingTasks} pending</span>
                      </div>
                    </div>
                  </div>
                  {isSelected ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                </button>

                {/* Expanded task list */}
                {isSelected && (
                  <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-3">
                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] text-xs font-medium hover:bg-[var(--gold)]/20 transition"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Task
                      </button>
                      {tasks.length === 0 && (
                        <button
                          onClick={handleBulkCreate}
                          disabled={actionLoading === "bulk"}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 text-xs font-medium hover:text-white hover:bg-white/5 transition disabled:opacity-50"
                        >
                          {actionLoading === "bulk" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListChecks className="h-3.5 w-3.5" />}
                          Load Default Tasks
                        </button>
                      )}
                      {tasks.length > 0 && (
                        <button
                          onClick={handleReset}
                          disabled={actionLoading === "reset"}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/10 transition disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Reset All
                        </button>
                      )}
                    </div>

                    {/* Task list */}
                    {tasks.length === 0 ? (
                      <div className="py-8 text-center text-zinc-500 text-sm">
                        No onboarding tasks yet. Add tasks or load defaults.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {tasks.map((task) => {
                          const isComplete = task.status === "COMPLETED";
                          const catLabel = CATEGORIES.find((c) => c.value === task.category)?.label ?? task.category;
                          return (
                            <div
                              key={task.id}
                              className={`flex items-start gap-3 p-3 rounded-lg transition ${
                                isComplete ? "bg-emerald-500/5" : "bg-white/[0.02]"
                              }`}
                            >
                              <button
                                onClick={() => handleToggle(task.id, task.status)}
                                disabled={actionLoading === task.id}
                                className="mt-0.5 shrink-0"
                              >
                                {actionLoading === task.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                                ) : (
                                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                                    isComplete ? "border-emerald-500 bg-emerald-500/20" : "border-zinc-600 hover:border-zinc-400"
                                  }`}>
                                    {isComplete && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                                  </div>
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${isComplete ? "text-zinc-400 line-through" : "text-white"}`}>
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-xs text-zinc-500 mt-0.5">{task.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">
                                    {catLabel}
                                  </span>
                                  {task.completedAt && (
                                    <span className="text-[10px] text-emerald-500">
                                      Completed {new Date(task.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDelete(task.id)}
                                disabled={actionLoading === task.id + "del"}
                                className="text-zinc-600 hover:text-red-400 transition shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Create task form */}
                    {showCreate && (
                      <div className="rounded-lg border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-white">New Onboarding Task</p>
                          <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
                        </div>
                        <input
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Task title"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--gold)]/40"
                        />
                        <input
                          value={newDesc}
                          onChange={(e) => setNewDesc(e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--gold)]/40"
                        />
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--gold)]/40"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleCreateTask}
                          disabled={!newTitle.trim() || actionLoading === "create"}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-xs font-semibold hover:bg-yellow-400 transition disabled:opacity-50"
                        >
                          {actionLoading === "create" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                          Add Task
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
