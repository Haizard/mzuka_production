import Link from "next/link";
import { Scale, FileText, ExternalLink } from "lucide-react";

const legalDocs = [
  {
    title: "Client Service Agreement",
    description: "Standard photography & videography service agreement for all bookings.",
    action: "Create from Contracts",
    href: "/admin/finance/contracts",
  },
  {
    title: "Gallery Access Terms",
    description: "Terms governing client gallery access, download rights, and expiration policies.",
    action: "Manage Gallery Permissions",
    href: "/admin/security",
  },
  {
    title: "Privacy & Data Policy",
    description: "How client data, images, and personal information are collected, stored, and used.",
    action: "View Security Dashboard",
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

export default function LegalPage() {
  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--gold)]">MG AI Command Center</p>
        <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
          <Scale className="h-6 w-6 text-[var(--gold)]" />
          Legal Center
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Policies, agreements, and compliance documentation</p>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/finance/contracts"
          className="rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-5 hover:bg-[var(--gold)]/10 transition flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[var(--gold)] flex items-center justify-center text-black shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-white">Digital Contracts</p>
            <p className="text-sm text-zinc-400 mt-0.5">Create and manage client agreements</p>
          </div>
          <ExternalLink className="h-4 w-4 text-zinc-500 ml-auto" />
        </Link>
        <Link href="/admin/security"
          className="rounded-lg border border-white/10 bg-[var(--surface)] p-5 hover:border-white/20 transition flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
            <Scale className="h-6 w-6 text-zinc-400" />
          </div>
          <div>
            <p className="font-semibold text-white">Access & Audit Logs</p>
            <p className="text-sm text-zinc-400 mt-0.5">Full access history for compliance</p>
          </div>
          <ExternalLink className="h-4 w-4 text-zinc-500 ml-auto" />
        </Link>
      </div>

      {/* Policy documents */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Studio Policies</h3>
        {legalDocs.map((doc) => (
          <div key={doc.title} className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-white">{doc.title}</p>
                <p className="text-sm text-zinc-400 mt-1">{doc.description}</p>
              </div>
              {doc.href && doc.action && (
                <Link href={doc.href}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-[var(--gold)]/30 text-[var(--gold)] hover:bg-[var(--gold)]/10 transition whitespace-nowrap">
                  {doc.action}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Notice */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-5">
        <p className="text-sm font-semibold text-amber-300 mb-1">Legal Disclaimer</p>
        <p className="text-sm text-amber-200/80">
          The legal documents and policies on this platform are for internal studio reference. For legally binding agreements, consult a qualified attorney in your jurisdiction. All contracts generated through the Contracts module should be reviewed before sending to clients.
        </p>
      </div>
    </main>
  );
}
