"use client";

import { useState } from "react";
import { FileText, RefreshCw, Copy, Check, Sparkles } from "lucide-react";
import { getFinanceSummary } from "@/app/admin/finance/actions";
import { getProductionStats } from "@/app/admin/production/actions";

export default function ReportsPage() {
  const [report,   setReport]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [reportType, setReportType] = useState("monthly_summary");

  const generateReport = async () => {
    setLoading(true);
    setReport("");

    // Gather live data
    const [finRes, prodRes] = await Promise.all([
      getFinanceSummary(),
      getProductionStats(),
    ]);

    const fin  = finRes.summary;
    const prod = prodRes.stats;

    const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

    const dataContext = fin && prod ? `
LIVE STUDIO DATA:
Revenue (total): ${usd(fin.totalRevenue)}
Revenue (this month): ${usd(fin.monthRevenue)}
Revenue (this year): ${usd(fin.yearRevenue)}
Total expenses: ${usd(fin.totalExpenses)}
Net profit: ${usd(fin.netProfit)}
Unpaid invoices: ${fin.unpaidInvoices}
Overdue invoices: ${fin.overdueInvoices}
Paid invoices: ${fin.paidInvoices}
Total projects: ${prod.total}
Projects in shooting: ${prod.shooting}
Projects in editing: ${prod.editing}
Projects in review: ${prod.review}
Projects delivered: ${prod.delivered}
Overdue projects: ${prod.overdue}
` : "Live data unavailable — generate based on general studio context.";

    const prompts: Record<string, string> = {
      monthly_summary: `Generate a professional monthly business report for Muzuka Gilbert photography studio.
Include sections: Executive Summary, Revenue Overview, Production Pipeline, Key Achievements, Areas for Improvement, Next Month Goals.
Format as a clean professional report with clear headings.\n\n${dataContext}`,

      financial_report: `Generate a detailed financial report for Muzuka Gilbert photography studio.
Include: Revenue breakdown, Expense analysis, Profit margins, Invoice status, Cash flow observations, Financial recommendations.
Format professionally with clear numbers and insights.\n\n${dataContext}`,

      production_report: `Generate a production status report for Muzuka Gilbert photography studio.
Include: Active projects summary, Pipeline bottlenecks, Delivery performance, Team workload observations, Recommendations.
Format as an operations report.\n\n${dataContext}`,

      growth_analysis: `Generate a business growth analysis report for Muzuka Gilbert photography studio.
Include: Current performance snapshot, Growth opportunities, Market positioning recommendations, Revenue optimization suggestions, Action items.
Tone: strategic and actionable.\n\n${dataContext}`,
    };

    try {
      const res = await fetch("/api/ai-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompts[reportType] }),
      });
      const json = await res.json() as { content?: string; error?: string };
      if (json.content) setReport(json.content);
      else setReport(`Error: ${json.error ?? "Failed to generate report"}`);
    } catch {
      setReport("Error: Failed to connect to AI service");
    }

    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--gold)]">MG AI Command Center</p>
        <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
          <FileText className="h-6 w-6 text-[var(--gold)]" />
          Business Reports
        </h2>
        <p className="mt-1 text-sm text-zinc-400">AI-generated reports using live studio data</p>
      </div>

      <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-6 space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Report Type</label>
          <div className="grid gap-3 grid-cols-2">
            {[
              { id: "monthly_summary",   label: "Monthly Summary",     desc: "Full overview of the month" },
              { id: "financial_report",  label: "Financial Report",     desc: "Revenue, expenses & profit" },
              { id: "production_report", label: "Production Report",    desc: "Pipeline & delivery status" },
              { id: "growth_analysis",   label: "Growth Analysis",      desc: "Opportunities & action items" },
            ].map((r) => (
              <button key={r.id} onClick={() => setReportType(r.id)}
                className={`p-4 rounded-lg border text-left transition ${reportType === r.id ? "border-[var(--gold)]/50 bg-[var(--gold)]/5" : "border-white/10 hover:border-white/20"}`}>
                <p className="text-sm font-medium text-white">{r.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={generateReport} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--gold)] text-black font-semibold hover:bg-yellow-500 disabled:opacity-50 transition">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Generating…" : "Generate Report"}
          </button>
        </div>
      </div>

      {report && (
        <div className="rounded-lg border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-[var(--gold)]">Generated Report</p>
            <button onClick={copy} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition">
              {copied ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
            </button>
          </div>
          <pre className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">{report}</pre>
        </div>
      )}
    </main>
  );
}
