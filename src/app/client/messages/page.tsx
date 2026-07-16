"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MessageSquare, Send, ChevronLeft } from "lucide-react";

interface PUser { id: string; name: string; role: string; }
interface DMessage { id: string; senderId: string; body: string; createdAt: string; sender: PUser; }
interface Convo { id: string; adminId: string; participantId: string; admin: PUser; participant: PUser; messages: DMessage[]; }

function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(d).toLocaleDateString();
}

export const dynamic = "force-dynamic";

export default function ClientMessagesPage() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [selected, setSelected] = useState<Convo | null>(null);
  const [msgs, setMsgs] = useState<DMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [meId, setMeId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConvos = useCallback(async () => {
    const res = await fetch("/api/dm/conversations");
    if (res.ok) { const d = await res.json(); setConvos(d.conversations ?? []); }
  }, []);

  const loadMsgs = useCallback(async (id: string) => {
    const res = await fetch(`/api/dm/conversations/${id}/messages`);
    if (res.ok) { const d = await res.json(); setMsgs(d.messages ?? []); }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(d => { if (d?.user) setMeId(d.user.id); });
    loadConvos();
  }, [loadConvos]);

  useEffect(() => {
    if (!selected) return;
    loadMsgs(selected.id);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => { loadMsgs(selected.id); loadConvos(); }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected, loadMsgs, loadConvos]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function sendMsg(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    const body = input.trim();
    setInput("");
    await fetch(`/api/dm/conversations/${selected.id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }),
    });
    await loadMsgs(selected.id);
    await loadConvos();
    setSending(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-5 w-5 text-[var(--gold)]" />
        <h1 className="text-xl font-bold text-white">Messages</h1>
        <span className="text-xs text-zinc-500 ml-1">— Private conversations with the Muzuka Gilbert team</span>
      </div>

      <div className="flex gap-4 h-[calc(100vh-16rem)] min-h-[400px]">
        {/* Conversation list */}
        <div className={`${selected ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-64 bg-[var(--surface)] border border-white/10 rounded-xl overflow-hidden shrink-0`}>
          <div className="p-3 border-b border-white/10">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Your Chats</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 px-4 text-center">
                <MessageSquare className="h-7 w-7 text-zinc-700" />
                <p className="text-xs text-zinc-600">No messages yet. The admin team will reach out here.</p>
              </div>
            ) : convos.map(c => {
              const other = c.admin;
              const last = c.messages[0];
              const isSelected = selected?.id === c.id;
              return (
                <button key={c.id} onClick={() => setSelected(c)}
                  className={`w-full flex items-start gap-3 px-3 py-3 border-b border-white/5 hover:bg-white/5 transition text-left ${isSelected ? "bg-white/8" : ""}`}>
                  <div className="h-9 w-9 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] text-sm font-bold shrink-0">
                    MG
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white font-medium truncate">{other.name}</p>
                      {last && <p className="text-[10px] text-zinc-600 shrink-0 ml-1">{timeAgo(last.createdAt)}</p>}
                    </div>
                    <p className="text-xs text-zinc-500">Admin Team</p>
                    {last && <p className="text-xs text-zinc-600 truncate mt-0.5">{last.body}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className={`${selected ? "flex" : "hidden sm:flex"} flex-1 flex-col bg-[var(--surface)] border border-white/10 rounded-xl overflow-hidden min-w-0`}>
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <MessageSquare className="h-12 w-12 text-zinc-700" />
              <p className="text-zinc-500 text-sm">Select a conversation</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <button onClick={() => setSelected(null)} className="sm:hidden text-zinc-400 hover:text-white transition">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="h-8 w-8 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] text-xs font-bold">
                  MG
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{selected.admin.name}</p>
                  <p className="text-xs text-zinc-500">Muzuka Gilbert Team</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgs.length === 0 && (
                  <p className="text-center text-xs text-zinc-600 mt-8">No messages yet. You can reply to admin messages here.</p>
                )}
                {msgs.map(m => {
                  const isMe = m.senderId === meId;
                  return (
                    <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe ? "bg-[var(--gold)] text-black rounded-br-sm" : "bg-white/10 text-white rounded-bl-sm"
                      }`}>
                        <p>{m.body}</p>
                        <p className={`text-[10px] mt-1 ${isMe ? "text-black/50" : "text-zinc-500"}`}>{timeAgo(m.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={sendMsg} className="flex items-center gap-2 px-4 py-3 border-t border-white/10">
                <input type="text" value={input} onChange={e => setInput(e.target.value)}
                  placeholder="Type a reply..."
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--gold)]/50"
                />
                <button type="submit" disabled={!input.trim() || sending}
                  className="p-2.5 rounded-xl bg-[var(--gold)] text-black hover:opacity-90 disabled:opacity-40 transition">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
