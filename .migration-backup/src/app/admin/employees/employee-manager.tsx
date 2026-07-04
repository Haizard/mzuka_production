"use client";

import { useState } from "react";
import {
  Users, Plus, Pencil, ShieldCheck, Briefcase, X, Check,
} from "lucide-react";
import { STAFF_ROLES, type StaffRoleValue } from "./staff-roles";
import {
  createStaffMemberAction,
  updateStaffRoleAction,
} from "./staff-actions";
import { toggleProductionManagerAction } from "@/app/admin/equipment/actions";

interface StaffMember {
  id: string; name: string; email: string; phone: string | null;
  role: string; staffRole: string | null; isProductionManager: boolean; createdAt: Date;
  staffAssignments: { id: string; role: string; project: { id: string; stage: string; booking: { title: string } } }[];
}

interface RoleBreakdown {
  value: string; label: string; colour: string; count: number;
}

export function EmployeeManager({ staff, grouped, roleBreakdown }: {
  staff: StaffMember[];
  grouped: Record<string, StaffMember[]>;
  roleBreakdown: RoleBreakdown[];
}) {
  const [activeRole, setActiveRole] = useState<string>("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [localStaff, setLocalStaff] = useState(staff);

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  };

  // Filtered list
  const displayed = activeRole === "ALL"
    ? localStaff
    : localStaff.filter((m) => {
        const key = m.staffRole ?? (m.role === "FOUNDER" ? "ADMIN" : m.role);
        return key === activeRole;
      });

  const handleRoleUpdate = async (memberId: string, newStaffRole: string, isPM: boolean) => {
    const [roleRes, pmRes] = await Promise.all([
      updateStaffRoleAction(memberId, newStaffRole),
      toggleProductionManagerAction(memberId, isPM),
    ]);
    if (roleRes.success && pmRes.success) {
      setLocalStaff((prev) => prev.map((m) =>
        m.id === memberId ? { ...m, staffRole: newStaffRole, isProductionManager: isPM } : m
      ));
      setEditMember(null);
      flash("Role updated");
    } else {
      flash(roleRes.error ?? pmRes.error ?? "Failed to update", false);
    }
  };

  const handleCreate = async (data: { name: string; email: string; phone?: string; password: string; staffRole: StaffRoleValue }) => {
    const res = await createStaffMemberAction(data);
    if (res.success && res.member) {
      setLocalStaff((prev) => [...prev, res.member as StaffMember]);
      setShowCreate(false);
      flash(`${data.name} added as ${data.staffRole}`);
    } else {
      flash(res.error ?? "Failed to create", false);
    }
  };

  const getRoleInfo = (member: StaffMember) => {
    const key = member.staffRole ?? (member.role === "FOUNDER" ? "ADMIN" : "STAFF");
    return STAFF_ROLES.find((r) => r.value === key) ?? { label: key, colour: "text-zinc-400 bg-zinc-700/50" };
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-red-500/20 bg-red-500/10 text-red-300"}`}>
          {msg.text}
        </div>
      )}

      {/* Role filter tabs */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setActiveRole("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${activeRole === "ALL" ? "bg-white/15 text-white border-white/20" : "border-white/10 text-zinc-400 hover:text-white"}`}>
            All ({localStaff.length})
          </button>
          {roleBreakdown.map((r) => (
            <button key={r.value} onClick={() => setActiveRole(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${activeRole === r.value ? "bg-white/15 text-white border-white/20" : "border-white/10 text-zinc-400 hover:text-white"}`}>
              {r.label} ({localStaff.filter((m) => (m.staffRole ?? (m.role === "FOUNDER" ? "ADMIN" : m.role)) === r.value).length})
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-400 transition">
          <Plus className="h-4 w-4" /> Add Staff
        </button>
      </div>

      {/* Staff grid */}
      {displayed.length === 0 ? (
        <div className="py-12 text-center rounded-lg border border-white/10 bg-[var(--surface)] text-zinc-500">
          No staff in this role
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((member) => {
            const roleInfo = getRoleInfo(member);
            return (
              <div key={member.id} className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--gold)]/20 flex items-center justify-center text-[var(--gold)] font-bold text-sm shrink-0">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{member.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{member.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditMember(member)}
                    className="text-zinc-500 hover:text-[var(--gold)] transition shrink-0 ml-2">
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>

                {/* Role badge */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleInfo.colour}`}>
                    {roleInfo.label}
                  </span>
                  {member.isProductionManager && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> PM
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1 text-xs text-zinc-500">
                  {member.phone && <p>📞 {member.phone}</p>}
                  <p>🗓 Joined {new Date(member.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                  <p>📋 {member.staffAssignments.length} project{member.staffAssignments.length !== 1 ? "s" : ""}</p>
                </div>

                {/* Recent projects */}
                {member.staffAssignments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                    {member.staffAssignments.slice(0,2).map((a) => (
                      <div key={a.id} className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Briefcase className="h-3 w-3 text-zinc-600 shrink-0" />
                        <span className="truncate">{a.project.booking.title}</span>
                        <span className={`shrink-0 ${a.project.stage === "DELIVERED" ? "text-emerald-400" : "text-zinc-600"}`}>
                          {a.project.stage}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}

      {/* Edit role modal */}
      {editMember && (
        <EditRoleModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSave={handleRoleUpdate}
        />
      )}
    </div>
  );
}

// ── Create Staff Modal ────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (data: { name: string; email: string; phone?: string; password: string; staffRole: StaffRoleValue }) => void;
}) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [password, setPassword] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRoleValue>("PHOTOGRAPHER");
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) { setErr("Name, email, and password are required"); return; }
    if (password.length < 8) { setErr("Password must be at least 8 characters"); return; }
    setSaving(true);
    await onCreate({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || undefined, password, staffRole });
    setSaving(false);
  };

  return (
    <Modal title="Add Staff Member" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Full Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Kamau"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Email *</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="john@muzuka.com"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 700 000 000"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Temporary Password *</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="Min 8 characters"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Staff Role *</label>
          <select value={staffRole} onChange={(e) => setStaffRole(e.target.value as StaffRoleValue)}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
            {STAFF_ROLES.filter((r) => r.value !== "ADMIN").map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">Cancel</button>
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold disabled:opacity-50 transition">
            {saving ? "Creating…" : "Create Account"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit Role Modal ───────────────────────────────────────────────────────────

function EditRoleModal({ member, onClose, onSave }: {
  member: StaffMember;
  onClose: () => void;
  onSave: (id: string, staffRole: string, isPM: boolean) => void;
}) {
  const current = member.staffRole ?? (member.role === "FOUNDER" ? "ADMIN" : "PHOTOGRAPHER");
  const [staffRole, setStaffRole] = useState<StaffRoleValue>(current as StaffRoleValue);
  const [isPM, setIsPM] = useState(member.isProductionManager);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave(member.id, staffRole, isPM);
    setSaving(false);
  };

  return (
    <Modal title={`Edit Role — ${member.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Staff Role</label>
          <select value={staffRole} onChange={(e) => setStaffRole(e.target.value as StaffRoleValue)}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
            {STAFF_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {member.role === "STAFF" && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div>
              <p className="text-sm font-medium text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-400" /> Production Manager
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">Can manage equipment inventory and approve returns</p>
            </div>
            <button onClick={() => setIsPM((p) => !p)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isPM ? "bg-violet-600" : "bg-zinc-700"}`}>
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPM ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold disabled:opacity-50 transition">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
