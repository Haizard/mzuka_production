"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  MessageSquare, Send, Plus, Search, X, User as UserIcon, ChevronLeft,
} from "lucide-react";

interface PUser { id: string; name: string; role: string; staffRole?: string | null; email?: string; }
interface DMessage { id: string; senderId: string; body: string; createdAt: string; sender: PUser; }
interface Convo {
  id: string; adminId: string; participantId: string;
  admin: PUser; participant: PUser;
  messages: DMessage[];
}

function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(d).toLocaleDateString();
}

export default function AdminMessagesPage() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [selected, setSelected] = useState<Convo | null>(null);
  const [msgs, setMsgs] = useState<DMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [allUsers, setAllUsers] = useState<PUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [meId, setMeId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConvos = useCallback(async () => {
    const res = await fetch("/api/dm/conversations");
    if (res.ok) { const d = await res.json(); setConvos(d.conversations ?? []); }
  }, []);

  const loadMsgs = useCallback(async (convoId: string) => {
    const res = await fetch(`/api/dm/conversations/${convoId}/messages`);
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

  async function loadUsers() {
    const res = await fetch("/api/admin/users-list");
    if (res.ok) { const d = await res.json(); setAllUsers(d.users ?? []); }
  }

  async function startConvo(participantId: string) {
    const res = await fetch("/api/dm/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId }),
    });
    if (res.ok) {
      const d = await res.json();
      await loadConvos();
      setSelected(d.conversation);
      setShowPicker(false);
      setUserSearch("");
    }
  }

  async function sendMsg(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !selected || sending) return;
    setSending(true);
    const body = input.trim();
    setInput("");
    await fetch(`/api/dm/conversations/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    await loadMsgs(selected.id);
    await loadConvos();
    setSending(false);
  }

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email ?? "").toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[var(--gold)]" /> Messages
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Private conversations with platform users</p>
        </div>
        <button
          onClick={() => { setShowPicker(true); loadUsers(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" /> New Message
        </button>
      </div>

      {/* User Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Select a user to message</h2>
              <button onClick={() => setShowPicker(false)} className="text-zinc-500 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--gold)]/50"
              />
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {filteredUsers.length === 0 && (
                <p className="text-center text-zinc-600 text-sm py-4">No users found</p>
              )}
              {filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => startConvo(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition text-left"
                >
                  <div className="h-8 w-8 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] text-xs font-bold shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{u.name}</p>
                    <p className="text-xs text-zinc-500 capitalize">{(u.staffRole ?? u.role).toLowerCase().replace(/_/g, " ")}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Conversation list */}
        <div className={`${selected ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-72 bg-[var(--surface)] border border-white/10 rounded-xl overflow-hidden shrink-0`}>
          <div className="p-3 border-b border-white/10">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convos.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <MessageSquare className="h-8 w-8 text-zinc-700" />
                <p className="text-xs text-zinc-600">No conversations yet</p>
              </div>
            )}
            {convos.map(c => {
              const other = c.participant;
              const last = c.messages[0];
              const isSelected = selected?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full flex items-start gap-3 px-3 py-3 border-b border-white/5 hover:bg-white/5 transition text-left ${isSelected ? "bg-white/8" : ""}`}
                >
                  <div className="h-9 w-9 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] text-sm font-bold shrink-0">
                    {other.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white font-medium truncate">{other.name}</p>
                      {last && <p className="text-[10px] text-zinc-600 shrink-0 ml-1">{timeAgo(last.createdAt)}</p>}
                    </div>
                    <p className="text-xs text-zinc-500 truncate capitalize">{(other.staffRole ?? other.role).toLowerCase().replace(/_/g," ")}</p>
                    {last && <p className="text-xs text-zinc-600 truncate mt-0.5">{last.body}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className={`${selected ? "flex" : "hidden lg:flex"} flex-1 flex-col bg-[var(--surface)] border border-white/10 rounded-xl overflow-hidden min-w-0`}>
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <MessageSquare className="h-12 w-12 text-zinc-700" />
              <p className="text-zinc-500 text-sm">Select a conversation or start a new one</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <button onClick={() => setSelected(null)} className="lg:hidden text-zinc-400 hover:text-white transition">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="h-8 w-8 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] text-xs font-bold">
                  {selected.participant.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{selected.participant.name}</p>
                  <p className="text-xs text-zinc-500 capitalize">{(selected.participant.staffRole ?? selected.participant.role).toLowerCase().replace(/_/g," ")}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgs.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-24 gap-2">
                    <UserIcon className="h-6 w-6 text-zinc-700" />
                    <p className="text-xs text-zinc-600">No messages yet. Say hello!</p>
                  </div>
                )}
                {msgs.map(m => {
                  const isMe = m.senderId === meId;
                  return (
                    <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? "bg-[var(--gold)] text-black rounded-br-sm"
                          : "bg-white/10 text-white rounded-bl-sm"
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
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--gold)]/50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="p-2.5 rounded-xl bg-[var(--gold)] text-black hover:opacity-90 disabled:opacity-40 transition"
                >
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
