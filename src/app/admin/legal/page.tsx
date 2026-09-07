"use client";

import { useState, useEffect } from "react";
import {
  Scale, FileText, ExternalLink, Upload, Trash2, Eye, EyeOff,
  Plus, X, RefreshCw, Download, Check, Shield, AlertTriangle,
} from "lucide-react";
import {
  listLegalDocuments,
  createLegalDocument,
  deleteLegalDocument,
  toggleLegalDocument,
} from "./actions";

type LegalDoc = any;

const CATEGORIES = [
  { value: "agreement", label: "Agreement", colour: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  { value: "policy", label: "Policy", colour: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { value: "terms", label: "Terms", colour: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  { value: "notice", label: "Notice", colour: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { value: "other", label: "Other", colour: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
];

const POLICY_DOCS = [
  {
    title: "Client Service Agreement",
    description: "Standard photography & videography service agreement for all bookings.",
    action: "Create from Contracts",
    href: "/admin/finance/contracts",
  },
  {
    title: "Gallery Access Terms",
    description: "Terms governing client gallery access, download rights, and expiration policies.",
    action: "Manage Permissions",
    href: "/admin/security",
  },
  {
    title: "Privacy & Data Policy",
    description: "How client data, images, and personal information are collected, stored, and used.",
    action: "Security Dashboard",
    href: "/admin/security",
  },
  {
    title: "Copyright & Licensing",
    description: "All images remain the intellectual property of Muzuka Gilbert. Clients receive a personal-use licence only.",
    action: null,
    href: null,
  },
  {
    title: "Cancellation & Refund Policy",
    description: "Cancellations within 14 days forfeit the deposit. Refunds processed within 7 business days.",
    action: null,
    href: null,
  },
  {
    title: "Watermark & Screenshot Notice",
    description: "Preview images are watermarked. CSS deterrence is applied but cannot prevent external camera capture. Dynamic watermarks contain client identification.",
    action: "Security Dashboard",
    href: "/admin/security",
  },
];

function catBadge(cat: string) {
  const c = CATEGORIES.find((x) => x.value === cat);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${c?.colour ?? "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"}`}>
      {c?.label ?? cat}
    </span>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function LegalPage() {
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const res = await listLegalDocuments();
    if (res.success) setDocs(res.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--gold)]">MG AI Command Center</p>
          <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
            <Scale className="h-6 w-6 text-[var(--gold)]" />
            Legal Center
          </h2>
          <p className="mt-1 text-sm text-zinc-400">Policies, agreements, and compliance documentation</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUpload(!showUpload)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${showUpload ? "bg-[var(--gold)] text-black" : "bg-white/5 text-zinc-400 hover:text-white border border-white/10"}`}>
            {showUpload ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showUpload ? "Close" : "Upload Document"}
          </button>
        </div>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <UploadForm onUploaded={() => { setShowUpload(false); loadData(); }} onCancel={() => setShowUpload(false)} />
      )}

      {/* Quick links */}
      <div className="grid gap-4 grid-cols-2">
        <a href="/admin/finance/contracts"
          className="rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-5 hover:bg-[var(--gold)]/10 transition flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[var(--gold)] flex items-center justify-center text-black shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-white">Digital Contracts</p>
            <p className="text-sm text-zinc-400 mt-0.5">Create and manage client agreements</p>
          </div>
          <ExternalLink className="h-4 w-4 text-zinc-500 ml-auto" />
        </a>
        <a href="/admin/security"
          className="rounded-lg border border-white/10 bg-[var(--surface)] p-5 hover:border-white/20 transition flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
            <Shield className="h-6 w-6 text-zinc-400" />
          </div>
          <div>
            <p className="font-semibold text-white">Access &amp; Audit Logs</p>
            <p className="text-sm text-zinc-400 mt-0.5">Full access history for compliance</p>
          </div>
          <ExternalLink className="h-4 w-4 text-zinc-500 ml-auto" />
        </a>
      </div>

      {/* Uploaded Documents */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Uploaded Documents ({docs.length})
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-zinc-500">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 rounded-lg border border-white/10 bg-[var(--surface)]">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents uploaded yet.</p>
            <p className="text-xs text-zinc-600 mt-1">Click &quot;Upload Document&quot; to add your first legal file.</p>
          </div>
        ) : (
          docs.map((doc: LegalDoc) => (
            <div key={doc.id} className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {catBadge(doc.category)}
                    {!doc.isPublished && (
                      <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">Draft</span>
                    )}
                  </div>
                  <p className="font-semibold text-white mt-2">{doc.title}</p>
                  {doc.description && <p className="text-sm text-zinc-400 mt-1">{doc.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                    {doc.fileName && <span>{doc.fileName}</span>}
                    {doc.fileSize && <span>{formatBytes(doc.fileSize)}</span>}
                    {doc.mimeType && <span>{doc.mimeType}</span>}
                    <span>Uploaded by {doc.uploadedBy?.name}</span>
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.fileUrl && (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
                      title="Download">
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  <button onClick={async () => { await toggleLegalDocument(doc.id); loadData(); }}
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
                    title={doc.isPublished ? "Hide" : "Publish"}>
                    {doc.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button onClick={async () => { if (confirm("Delete this document?")) { await deleteLegalDocument(doc.id); loadData(); } }}
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Static Policy Reference */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Studio Policies</h3>
        {POLICY_DOCS.map((doc) => (
          <div key={doc.title} className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-white">{doc.title}</p>
                <p className="text-sm text-zinc-400 mt-1">{doc.description}</p>
              </div>
              {doc.href && doc.action && (
                <a href={doc.href}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-[var(--gold)]/30 text-[var(--gold)] hover:bg-[var(--gold)]/10 transition whitespace-nowrap">
                  {doc.action}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Notice */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-5">
        <p className="text-sm font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4" /> Legal Disclaimer
        </p>
        <p className="text-sm text-amber-200/80">
          The legal documents and policies on this platform are for internal studio reference. For legally binding agreements, consult a qualified attorney in your jurisdiction. All contracts generated through the Contracts module should be reviewed before sending to clients.
        </p>
      </div>
    </main>
  );
}

/* ── Upload Form ──────────────────────────────────────────────────────────── */

function UploadForm({ onUploaded, onCancel }: { onUploaded: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "policy",
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { setError("Title is required."); return; }

    setUploading(true);
    setError("");
    setProgress("Creating record…");

    try {
      let fileUrl = "";
      let fileName = "";
      let fileSize = 0;
      let mimeType = "";

      if (file) {
        setProgress("Generating upload URL…");
        const urlRes = await fetch("/api/legal/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, mimeType: file.type }),
        });
        const urlData = await urlRes.json();

        if (!urlData.success) {
          setError(urlData.error || "Failed to get upload URL");
          setUploading(false);
          return;
        }

        setProgress("Uploading file…");
        const uploadRes = await fetch(urlData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          setError("File upload failed");
          setUploading(false);
          return;
        }

        fileUrl = urlData.s3Key;
        fileName = file.name;
        fileSize = file.size;
        mimeType = file.type;
      }

      setProgress("Saving…");
      const res = await createLegalDocument({
        title: form.title,
        description: form.description,
        category: form.category,
        fileUrl: fileUrl || undefined,
        fileName: fileName || undefined,
        fileSize: fileSize || undefined,
        mimeType: mimeType || undefined,
      });

      if (res.success) {
        onUploaded();
      } else {
        setError(res.error);
        setUploading(false);
      }
    } catch (err) {
      setError("Upload failed. Please try again.");
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-[var(--surface)] p-6 space-y-5">
      <p className="text-sm font-semibold text-white flex items-center gap-2">
        <Upload className="h-4 w-4 text-[var(--gold)]" />
        Upload Legal Document
      </p>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">{error}</div>
      )}

      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">Document Title *</label>
        <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Service Agreement 2026"
          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--gold)]/50" />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">Description</label>
        <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Brief description of this document"
          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--gold)]/50" />
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">Category</label>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button key={c.value} type="button" onClick={() => setForm({ ...form, category: c.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${form.category === c.value ? c.colour : "border-white/10 text-zinc-500 hover:text-white"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1.5">File (optional)</label>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.xlsx,.csv"
          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--gold)] file:text-black file:cursor-pointer hover:file:bg-yellow-500" />
        {file && (
          <p className="text-xs text-zinc-500 mt-1">{file.name} ({formatBytes(file.size)})</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white bg-white/5 border border-white/10 transition">
          Cancel
        </button>
        <button type="submit" disabled={uploading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--gold)] text-black font-semibold text-sm hover:bg-yellow-500 disabled:opacity-50 transition">
          {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {uploading ? progress : "Save Document"}
        </button>
      </div>
    </form>
  );
}
