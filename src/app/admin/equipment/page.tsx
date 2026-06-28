"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Trash2, Pencil, RefreshCw, Package, Tag, Check, X,
} from "lucide-react";
import type { EquipmentStatus, ConditionStatus } from "@prisma/client";
import {
  getCategoriesAction, createCategoryAction, updateCategoryAction, deleteCategoryAction,
  getEquipmentItemsAction, createEquipmentItemAction, updateEquipmentItemAction, deleteEquipmentItemAction,
} from "./actions";

interface Category { id: string; name: string; _count: { items: number } }
interface Item {
  id: string; name: string; serialNumber: string | null;
  condition: ConditionStatus; status: EquipmentStatus; notes: string | null;
  category: { id: string; name: string };
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
  const [tab, setTab] = useState<"inventory" | "categories">("inventory");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems]           = useState<Item[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterCat, setFilterCat]   = useState("");
  const [filterStatus, setFilterStatus] = useState<EquipmentStatus | "">("");
  const [showNewItem, setShowNewItem]   = useState(false);
  const [showNewCat,  setShowNewCat]    = useState(false);
  const [editItem, setEditItem]     = useState<Item | null>(null);
  const [acting, setActing]         = useState<string | null>(null);
  const [msg, setMsg]               = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [catRes, itemRes] = await Promise.all([
      getCategoriesAction(),
      getEquipmentItemsAction(filterCat ? { categoryId: filterCat } : filterStatus ? { status: filterStatus as EquipmentStatus } : {}),
    ]);
    if (catRes.success)  setCategories(catRes.categories as Category[]);
    if (itemRes.success) setItems(itemRes.items as unknown as Item[]);
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
        {(["inventory","categories"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition ${tab === t ? "border-[var(--gold)] text-[var(--gold)]" : "border-transparent text-zinc-400 hover:text-white"}`}>
            {t === "inventory" ? `Inventory (${items.length})` : `Categories (${categories.length})`}
          </button>
        ))}
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
