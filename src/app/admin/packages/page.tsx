"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X } from "lucide-react";
import {
  getServicePackages,
  createServicePackageAction,
  updateServicePackageAction,
  deleteServicePackageAction,
} from "./actions";

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  durationMin?: number | null;
  isActive: boolean;
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priceCents: 0,
    durationMin: "",
  });

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    const result = await getServicePackages();
    if (result.success) {
      setPackages(result.packages);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const input = {
      name: formData.name,
      description: formData.description,
      priceCents: Math.round(formData.priceCents * 100),
      durationMin: formData.durationMin ? parseInt(formData.durationMin) : undefined,
    };

    if (editingId) {
      const result = await updateServicePackageAction(editingId, input);
      if (result.success) {
        loadPackages();
        setEditingId(null);
        setShowForm(false);
      }
    } else {
      const result = await createServicePackageAction(input);
      if (result.success) {
        loadPackages();
        setShowForm(false);
      }
    }

    setFormData({
      name: "",
      description: "",
      priceCents: 0,
      durationMin: "",
    });
  };

  const handleEdit = (pkg: ServicePackage) => {
    setFormData({
      name: pkg.name,
      description: pkg.description,
      priceCents: pkg.priceCents / 100,
      durationMin: pkg.durationMin?.toString() || "",
    });
    setEditingId(pkg.id);
    setShowForm(true);
  };

  const handleDelete = async (packageId: string) => {
    if (confirm("Are you sure you want to delete this package?")) {
      const result = await deleteServicePackageAction(packageId);
      if (result.success) {
        loadPackages();
      }
    }
  };

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Service Packages</h2>
          <p className="mt-1 text-sm text-zinc-400">Manage booking packages and pricing</p>
        </div>
        <button
          onClick={() => {
            setFormData({ name: "", description: "", priceCents: 0, durationMin: "" });
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black hover:bg-yellow-500 transition"
        >
          <Plus className="h-4 w-4" />
          New Package
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">
              {editingId ? "Edit Package" : "Create New Package"}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Package Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-zinc-500 focus:border-[var(--gold)] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-zinc-500 focus:border-[var(--gold)] focus:outline-none"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.priceCents}
                  onChange={(e) =>
                    setFormData({ ...formData, priceCents: parseFloat(e.target.value) })
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-zinc-500 focus:border-[var(--gold)] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1">
                  Duration (minutes, optional)
                </label>
                <input
                  type="number"
                  value={formData.durationMin}
                  onChange={(e) => setFormData({ ...formData, durationMin: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-zinc-500 focus:border-[var(--gold)] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black hover:bg-yellow-500 transition"
              >
                {editingId ? "Save Changes" : "Create Package"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-white/10 px-4 py-2 font-semibold text-white hover:bg-white/5 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Packages List */}
      <div className="rounded-lg border border-white/10 bg-[var(--surface)]">
        {isLoading ? (
          <div className="p-8 text-center text-zinc-400">Loading packages...</div>
        ) : packages.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">No packages created yet</div>
        ) : (
          <div className="divide-y divide-white/10">
            {packages.map((pkg) => (
              <div key={pkg.id} className="p-6 hover:bg-white/5 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{pkg.name}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{pkg.description}</p>
                    <div className="mt-3 flex gap-4 flex-wrap">
                      <div>
                        <p className="text-xs text-zinc-500">Price</p>
                        <p className="font-semibold text-[var(--gold)]">
                          ${(pkg.priceCents / 100).toFixed(2)}
                        </p>
                      </div>
                      {pkg.durationMin && (
                        <div>
                          <p className="text-xs text-zinc-500">Duration</p>
                          <p className="font-semibold text-white">{pkg.durationMin} min</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-zinc-500">Status</p>
                        <p className={`font-semibold ${pkg.isActive ? "text-emerald-300" : "text-red-300"}`}>
                          {pkg.isActive ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(pkg)}
                      className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(pkg.id)}
                      className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
