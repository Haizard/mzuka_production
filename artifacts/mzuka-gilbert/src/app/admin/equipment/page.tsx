"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Trash2, Pencil, RefreshCw, Package, Tag, Check, X, UserPlus,
} from "lucide-react";
import type { EquipmentStatus, ConditionStatus } from "@prisma/client";
import {
  getCategoriesAction, createCategoryAction, updateCategoryAction, deleteCategoryAction,
  getEquipmentItemsAction, createEquipmentItemAction, updateEquipmentItemAction, deleteEquipmentItemAction,
  assignEquipmentAction, getOpenTasksAction,
} from "./actions";

interface Category { id: string; name: string; _count: { items: number } }
interface Item {
  id: string; name: string; serialNumber: string | null;
  condition: ConditionStatus; status: EquipmentStatus; notes: string | null;
  category: { id: string; name: string };
}
interface OpenTask {
  id: string; title: string; status: string;
  assignee: { id: string; name: string; staffRole: string | null } | null;
  project: { booking: { title: string; serviceType: string } };
  equipmentAssignments: { item: { id: string; name: string } }[];
}

const CONDITIONS: ConditionStatus[] = ["EXCELLENT","GOOD","FAIR","DAMAGED"];
const STATUSES: EquipmentStatus[]   = ["AVAILABLE","ASSIGNED","UNDER_MAINTENANCE","RETIRED"];

const CONDITION_COLOUR: Record<ConditionStatus, string> = {
  EXCELLENT: "text-emerald-400 bg-emerald-500/10",
  GOOD:      "text-blue-400 bg-blue-500/10",
  FAIR:      "text-amber-400 bg-amber-500/10",
  DAMAGED:   "text-red-400 bg-red-500/10",
};
const STATUS_COLOUR: Record<EquipmentStatus, string> = {
  AVAILABLE:        "text-emerald-400 bg-emerald-500/10",
  ASSIGNED:         "text-blue-400 bg-blue-500/10",
  UNDER_MAINTENANCE:"text-amber-400 bg-amber-500/10",
  RETIRED:          "text-zinc-400 bg-zinc-700/50",
};

export default function EquipmentPage() {
  const [tab, setTab] = useState<"inventory" | "assign" | "categories">("inventory");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems]           = useState<Item[]>([]);
  const [openTasks, setOpenTasks]   = useState<OpenTask[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterCat, setFilterCat]   = useState("");
  const [filterStatus, setFilterStatus] = useState<EquipmentStatus | "">("");
  const [showNewItem, setShowNewItem]   = useState(false);
  const [showNewCat,  setShowNewCat]    = useState(false);
  const [editItem, setEditItem]     = useState<Item | null>(null);
  const [acting, setActing]         = useState<string | null>(null);
  const [msg, setMsg]               = useState<{ text: string; ok: boolean } | null>(null);

  // Assign-to-staff form state
  const [assignItemId,  setAssignItemId]  = useState("");
  const [assignTaskId,  setAssignTaskId]  = useState("");
  const [assigning,     setAssigning]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [catRes, itemRes, taskRes] = await Promise.all([
      getCategoriesAction(),
      getEquipmentItemsAction(filterCat ? { categoryId: filterCat } : filterStatus ? { status: filterStatus as EquipmentStatus } : {}),
      getOpenTasksAction(),
    ]);
    if (catRes.success)  setCategories(catRes.categories as Category[]);
    if (itemRes.success) setItems(itemRes.items as unknown as Item[]);
    if (taskRes.success) setOpenTasks(taskRes.tasks as unknown as OpenTask[]);
    setLoading(false);
  }, [filterCat, filterStatus]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this equipment item?")) return;
    setActing(id);
    const res = await deleteEquipmentItemAction(id);
    if (res.success) { flash("Item deleted"); load(); }
    else flash(res.error ?? "Failed", false);
    setActing(null);
  };

  const deleteCat = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    setActing(id);
    const res = await deleteCategoryAction(id);
    if (res.success) { flash("Category deleted"); load(); }
    else flash(res.error ?? "Failed", false);
    setActing(null);
  };

  const doAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignItemId || !assignTaskId) return;
    setAssigning(true);
    const res = await assignEquipmentAction({ taskId: assignTaskId, itemId: assignItemId });
    if (res.success) {
      flash(`Equipment assigned successfully`);
      setAssignItemId("");
      setAssignTaskId("");
      load();
    } else {
      flash(res.error ?? "Failed to assign", false);
    }
    setAssigning(false);
  };

  const filtered = items.filter((item) => {
    if (filterCat    && item.category.id !== filterCat)    return false;
    if (filterStatus && item.status !== filterStatus)       return false;
    return true;
  });

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Production Manager</p>
          <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
            <Package className="h-6 w-6 text-[var(--gold)]" /> Equipment Inventory
          </h2>
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white transition">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {msg && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-red-500/20 bg-red-500/10 text-red-300"}`}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        <button onClick={() => setTab("inventory")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === "inventory" ? "border-[var(--gold)] text-[var(--gold)]" : "border-transparent text-zinc-400 hover:text-white"}`}>
          Inventory ({items.length})
        </button>
        <button onClick={() => setTab("assign")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === "assign" ? "border-[var(--gold)] text-[var(--gold)]" : "border-transparent text-zinc-400 hover:text-white"}`}>
          <UserPlus className="h-3.5 w-3.5" /> Assign to Staff
        </button>
        <button onClick={() => setTab("categories")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === "categories" ? "border-[var(--gold)] text-[var(--gold)]" : "border-transparent text-zinc-400 hover:text-white"}`}>
          Categories ({categories.length})
        </button>
      </div>

      {/* ── INVENTORY ── */}
      {tab === "inventory" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none">
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as EquipmentStatus | "")}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none">
                <option value="">All statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
              </select>
            </div>
            <button onClick={() => setShowNewItem(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-400 transition">
              <Plus className="h-4 w-4" /> Add Equipment
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-zinc-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center rounded-lg border border-white/10 bg-[var(--surface)] text-zinc-500">
              No equipment items found
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-[var(--surface)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs text-zinc-500 uppercase">
                      <th className="px-5 py-3">Item</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Serial</th>
                      <th className="px-5 py-3">Condition</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((item) => (
                      <tr key={item.id} className="hover:bg-white/5 transition">
                        <td className="px-5 py-3">
                          <p className="text-white font-medium">{item.name}</p>
                          {item.notes && <p className="text-xs text-zinc-500 truncate max-w-[180px]">{item.notes}</p>}
                        </td>
                        <td className="px-5 py-3 text-zinc-400">{item.category.name}</td>
                        <td className="px-5 py-3 text-zinc-500 font-mono text-xs">{item.serialNumber ?? "—"}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONDITION_COLOUR[item.condition]}`}>
                            {item.condition}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOUR[item.status]}`}>
                            {item.status.replace("_"," ")}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setEditItem(item)} className="text-zinc-500 hover:text-[var(--gold)] transition">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteItem(item.id)} disabled={acting === item.id}
                              className="text-zinc-600 hover:text-red-400 transition disabled:opacity-50">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ASSIGN TO STAFF ── */}
      {tab === "assign" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-6">
            <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[var(--gold)]" /> Assign Equipment to Staff Task
            </h3>
            <p className="text-sm text-zinc-400 mb-5">
              Select an available item and an open task. Equipment will be assigned to the task's assignee.
            </p>
            <form onSubmit={doAssign} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Equipment selector */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Available Equipment *</label>
                  <select
                    value={assignItemId}
                    onChange={(e) => setAssignItemId(e.target.value)}
                    required
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]"
                  >
                    <option value="">Select equipment…</option>
                    {items.filter((i) => i.status === "AVAILABLE").map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.category.name}){item.serialNumber ? ` — SN: ${item.serialNumber}` : ""}
                      </option>
                    ))}
                  </select>
                  {items.filter((i) => i.status === "AVAILABLE").length === 0 && (
                    <p className="text-xs text-amber-400 mt-1.5">No available equipment — all items are currently assigned or retired.</p>
                  )}
                </div>

                {/* Task selector */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Staff Task *</label>
                  <select
                    value={assignTaskId}
                    onChange={(e) => setAssignTaskId(e.target.value)}
                    required
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]"
                  >
                    <option value="">Select task…</option>
                    {openTasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.assignee?.name ?? "Unassigned"} — {task.title} ({task.project.booking.title})
                      </option>
                    ))}
                  </select>
                  {openTasks.length === 0 && (
                    <p className="text-xs text-amber-400 mt-1.5">No open tasks with assigned staff. Assign staff in Production first.</p>
                  )}
                </div>
              </div>

              {/* Preview */}
              {assignItemId && assignTaskId && (() => {
                const item = items.find((i) => i.id === assignItemId);
                const task = openTasks.find((t) => t.id === assignTaskId);
                if (!item || !task) return null;
                return (
                  <div className="rounded-lg bg-[var(--gold)]/5 border border-[var(--gold)]/20 p-4 text-sm">
                    <p className="text-zinc-300 mb-1">
                      <span className="text-[var(--gold)] font-semibold">{item.name}</span>
                      {" "}will be assigned to{" "}
                      <span className="text-white font-semibold">{task.assignee?.name}</span>
                    </p>
                    <p className="text-zinc-500 text-xs">
                      Task: {task.title} · Booking: {task.project.booking.title}
                    </p>
                  </div>
                );
              })()}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={assigning || !assignItemId || !assignTaskId}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-400 disabled:opacity-50 transition"
                >
                  <UserPlus className="h-4 w-4" />
                  {assigning ? "Assigning…" : "Assign Equipment"}
                </button>
              </div>
            </form>
          </div>

          {/* Currently assigned equipment overview */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Currently Assigned ({items.filter((i) => i.status === "ASSIGNED").length})
            </h3>
            {loading ? (
              <div className="py-8 text-center text-zinc-500">Loading…</div>
            ) : items.filter((i) => i.status === "ASSIGNED").length === 0 ? (
              <div className="py-8 text-center rounded-lg border border-white/10 bg-[var(--surface)] text-zinc-500">
                No equipment currently assigned
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-[var(--surface)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs text-zinc-500 uppercase">
                      <th className="px-5 py-3">Item</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Serial</th>
                      <th className="px-5 py-3">Condition</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.filter((i) => i.status === "ASSIGNED").map((item) => (
                      <tr key={item.id} className="hover:bg-white/5 transition">
                        <td className="px-5 py-3">
                          <p className="text-white font-medium">{item.name}</p>
                          {item.notes && <p className="text-xs text-zinc-500 truncate max-w-[180px]">{item.notes}</p>}
                        </td>
                        <td className="px-5 py-3 text-zinc-400">{item.category.name}</td>
                        <td className="px-5 py-3 text-zinc-500 font-mono text-xs">{item.serialNumber ?? "—"}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONDITION_COLOUR[item.condition]}`}>
                            {item.condition}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CATEGORIES ── */}
      {tab === "categories" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowNewCat(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-400 transition">
              <Plus className="h-4 w-4" /> Add Category
            </button>
          </div>
          {loading ? <div className="py-12 text-center text-zinc-500">Loading…</div> : (
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <CategoryCard key={cat.id} cat={cat} onDelete={deleteCat} onUpdate={async (id, name) => {
                  const res = await updateCategoryAction(id, name);
                  if (res.success) { flash("Category updated"); load(); }
                  else flash(res.error ?? "Failed", false);
                }} acting={acting} />
              ))}
              {categories.length === 0 && (
                <div className="col-span-3 py-12 text-center text-zinc-500">No categories yet</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showNewItem && (
        <ItemModal categories={categories} onClose={() => setShowNewItem(false)} onSaved={() => { load(); flash("Equipment added"); }} />
      )}
      {editItem && (
        <ItemModal item={editItem} categories={categories} onClose={() => setEditItem(null)} onSaved={() => { load(); flash("Equipment updated"); }} />
      )}
      {showNewCat && (
        <CategoryModal onClose={() => setShowNewCat(false)} onSaved={() => { load(); flash("Category created"); }} />
      )}
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CategoryCard({ cat, onDelete, onUpdate, acting }: {
  cat: Category; acting: string | null;
  onDelete: (id: string) => void;
  onUpdate: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);

  return (
    <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-4">
      {editing ? (
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
          <button onClick={() => { onUpdate(cat.id, name); setEditing(false); }}
            className="px-2 py-1.5 rounded-lg bg-[var(--gold)] text-black text-xs font-bold">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={() => { setEditing(false); setName(cat.name); }}
            className="px-2 py-1.5 rounded-lg border border-white/10 text-zinc-400 text-xs">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-[var(--gold)]" />
            <p className="font-medium text-white">{cat.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">{cat._count.items} items</span>
            <button onClick={() => setEditing(true)} className="text-zinc-500 hover:text-[var(--gold)] transition">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onDelete(cat.id)} disabled={acting === cat.id}
              className="text-zinc-600 hover:text-red-400 transition">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName]   = useState("");
  const [err, setErr]     = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await createCategoryAction(name);
    if (res.success) { onSaved(); onClose(); }
    else setErr(res.error ?? "Failed");
    setSaving(false);
  };

  return (
    <Modal title="New Category" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Category Name *" value={name} onChange={setName} placeholder="e.g. Camera, Audio, Lighting" />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <ModalActions onClose={onClose} saving={saving} label="Create" />
      </form>
    </Modal>
  );
}

function ItemModal({ item, categories, onClose, onSaved }: {
  item?: Item; categories: Category[]; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName]         = useState(item?.name ?? "");
  const [categoryId, setCategoryId] = useState(item?.category.id ?? "");
  const [condition, setCondition] = useState<ConditionStatus>(item?.condition ?? "GOOD");
  const [status, setStatus]     = useState<EquipmentStatus>(item?.status ?? "AVAILABLE");
  const [serial, setSerial]     = useState(item?.serialNumber ?? "");
  const [notes, setNotes]       = useState(item?.notes ?? "");
  const [err, setErr]           = useState("");
  const [saving, setSaving]     = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let res;
    if (item) {
      res = await updateEquipmentItemAction(item.id, { name, condition, status, notes: notes || undefined });
    } else {
      res = await createEquipmentItemAction({ name, categoryId, condition, serialNumber: serial || undefined, notes: notes || undefined });
    }
    if (res.success) { onSaved(); onClose(); }
    else setErr(res.error ?? "Failed");
    setSaving(false);
  };

  return (
    <Modal title={item ? "Edit Equipment" : "Add Equipment"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name *" value={name} onChange={setName} placeholder="e.g. Sony A7IV Camera" />
        {!item && (
          <>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Category *</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Field label="Serial Number" value={serial} onChange={setSerial} placeholder="Optional" required={false} />
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Condition</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value as ConditionStatus)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {item && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
              </select>
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--gold)] resize-none" />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <ModalActions onClose={onClose} saving={saving} label={item ? "Save" : "Add"} />
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--surface)] p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-5">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required = true }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1.5">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
    </div>
  );
}

function ModalActions({ onClose, saving, label }: { onClose: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">Cancel</button>
      <button type="submit" disabled={saving}
        className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-400 disabled:opacity-50 transition">
        {saving ? "Saving…" : label}
      </button>
    </div>
  );
}
