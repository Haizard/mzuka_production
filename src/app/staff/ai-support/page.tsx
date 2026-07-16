"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, RotateCcw, Sparkles } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string; }

const STARTERS = [
  "What tools should I learn for my role?",
  "How do I view my assigned projects?",
  "Where can I see my upcoming shoots?",
  "How do I log equipment I've used?",
  "What are the best Adobe tools for my work?",
];

export default function StaffAiSupportPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    const updated: Msg[] = [...messages, { role: "user", content }];
    setMessages(updated);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/platform-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      const d = res.ok ? await res.json() : { reply: "Something went wrong. Please try again." };
      setMessages(prev => [...prev, { role: "assistant", content: d.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Network error. Please try again." }]);
    }
    setLoading(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="h-5 w-5 text-[var(--gold)]" /> AI Platform Assistant
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Platform navigation, professional tools, and growth tips for your role</p>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5">
            <RotateCcw className="h-3.5 w-3.5" /> New chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-[var(--surface)] border border-white/10 rounded-2xl p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="h-14 w-14 rounded-2xl bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-[var(--gold)]" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-white">Your professional AI guide</p>
              <p className="text-xs text-zinc-500 mt-1">Ask me about the platform or get tool recommendations for your role.</p>
            </div>
            <div className="grid gap-2 w-full max-w-sm">
              {STARTERS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl border border-white/10 hover:border-[var(--gold)]/30 hover:bg-white/5 text-sm text-zinc-300 hover:text-white transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
                {m.role === "assistant" && (
                  <div className="h-7 w-7 rounded-lg bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "bg-[var(--gold)] text-black rounded-br-sm" : "bg-white/8 text-white rounded-bl-sm"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] shrink-0">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white/8 rounded-bl-sm flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Ask me anything…"
          className="flex-1 bg-[var(--surface)] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--gold)]/50 resize-none"
          style={{ maxHeight: "120px" }}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          className="p-3 rounded-2xl bg-[var(--gold)] text-black hover:opacity-90 disabled:opacity-40 transition shrink-0">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
