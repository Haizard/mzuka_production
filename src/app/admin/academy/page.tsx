"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { BookOpen, Plus, Eye } from "lucide-react";

async function getModules() {
  await requireAdmin();
  return prisma.academyModule.findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

export default async function AcademyPage() {
  const modules = await getModules();
  const published = modules.filter((m) => m.isPublished);
  const drafts    = modules.filter((m) => !m.isPublished);

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--gold)]">MG AI Command Center</p>
          <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[var(--gold)]" />
            MG Academy
          </h2>
          <p className="mt-1 text-sm text-zinc-400">Training modules, guides, and knowledge base for your team</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
          <p className="text-3xl font-bold text-[var(--gold)]">{modules.length}</p>
          <p className="text-sm text-zinc-400 mt-1">Total Modules</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-[var(--surface)] p-5">
          <p className="text-3xl font-bold text-emerald-400">{published.length}</p>
          <p className="text-sm text-zinc-400 mt-1">Published</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-[var(--surface)] p-5">
          <p className="text-3xl font-bold text-zinc-400">{drafts.length}</p>
          <p className="text-sm text-zinc-400 mt-1">Drafts</p>
        </div>
      </div>

      {/* Module list */}
      {modules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 p-16 text-center">
          <BookOpen className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">No training modules yet.</p>
          <p className="text-xs text-zinc-600 mt-1">Academy content management is coming in the next update.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <div key={mod.id} className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mod.isPublished ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-700/50 text-zinc-400"}`}>
                  {mod.isPublished ? "Published" : "Draft"}
                </span>
                <span className="text-xs text-zinc-500 capitalize">{mod.category}</span>
              </div>
              <h3 className="font-semibold text-white">{mod.title}</h3>
              {mod.description && <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{mod.description}</p>}
              <p className="text-xs text-zinc-600 mt-3">{mod.content.slice(0, 80)}…</p>
            </div>
          ))}
        </div>
      )}

      {/* Coming soon notice */}
      <div className="rounded-lg border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-5">
        <div className="flex gap-3">
          <Plus className="h-5 w-5 text-[var(--gold)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white">Full Academy Editor Coming Soon</p>
            <p className="text-sm text-zinc-400 mt-1">
              The full academy module editor — with rich text content, video embeds, quizzes, and staff progress tracking — will be built in the next update. Modules can be used to train photographers, editors, and client coordinators.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
