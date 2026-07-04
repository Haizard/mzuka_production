"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot, Send, Plus, Trash2, MessageSquare, Sparkles,
  FileText, Languages, Scissors, Hash, RefreshCw, Copy, Check,
} from "lucide-react";
import {
  createChatAction, sendMessageAction, getChatsAction,
  getChatMessagesAction, deleteChatAction,
  generateCaptionAction, generateScriptAction,
  translateContentAction, summarizeContentAction,
} from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Chat    { id: string; title: string; updatedAt: Date }
interface Message { id: string; role: string; content: string; createdAt: Date }

type Tool = "chat" | "caption" | "script" | "translate" | "summarize";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AiPage() {
  const [tool,      setTool]      = useState<Tool>("chat");
  const [chats,     setChats]     = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState("");
  const [copied,    setCopied]    = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Tool form state
  const [caption,   setCaption]   = useState({ subject: "", tone: "luxurious", platform: "Instagram", hashtags: true });
  const [script,    setScript]    = useState({ type: "Reel", duration: "30-second", topic: "", style: "cinematic and emotional" });
  const [translate, setTranslate] = useState({ content: "", targetLanguage: "Swahili" });
  const [summarize, setSummarize] = useState("");

  const loadChats = useCallback(async () => {
    const res = await getChatsAction();
    if (res.success) setChats(res.chats as Chat[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openChat = async (chatId: string) => {
    setActiveChatId(chatId);
    const res = await getChatMessagesAction(chatId);
    if (res.success) setMessages(res.messages as Message[]);
  };

  const newChat = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const res = await createChatAction(input);
    if (res.success && res.chatId) {
      setInput("");
      await loadChats();
      await openChat(res.chatId);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeChatId) return;
    const userMsg = input;
    setInput("");
    setMessages((p) => [...p, { id: Date.now().toString(), role: "user", content: userMsg, createdAt: new Date() }]);
    setLoading(true);
    const res = await sendMessageAction(activeChatId, userMsg);
    if (res.success && res.reply) {
      setMessages((p) => [...p, { id: (Date.now()+1).toString(), role: "assistant", content: res.reply!, createdAt: new Date() }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      activeChatId ? sendMessage() : newChat();
    }
  };

  const deleteChat = async (id: string) => {
    await deleteChatAction(id);
    if (activeChatId === id) { setActiveChatId(null); setMessages([]); }
    await loadChats();
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runTool = async () => {
    setLoading(true);
    setResult("");
    let res: { success: boolean; content?: string; error?: string } = { success: false };
    if (tool === "caption")   res = await generateCaptionAction(caption);
    if (tool === "script")    res = await generateScriptAction(script);
    if (tool === "translate") res = await translateContentAction(translate);
    if (tool === "summarize") res = await summarizeContentAction(summarize);
    if (res.success && res.content) setResult(res.content);
    else if (!res.success) setResult(`Error: ${res.error}`);
    setLoading(false);
  };

  return (
    <main className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--gold)]">MG AI Command Center</p>
        <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
          <Bot className="h-6 w-6 text-[var(--gold)]" />
          AI Assistant
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Chat, captions, scripts, translation, summarization</p>
      </div>

      {/* Tool selector */}
      <div className="flex flex-wrap gap-2">
        {([
          { id: "chat",      label: "AI Chat",    icon: MessageSquare },
          { id: "caption",   label: "Caption",    icon: Hash },
          { id: "script",    label: "Script",     icon: Scissors },
          { id: "translate", label: "Translate",  icon: Languages },
          { id: "summarize", label: "Summarize",  icon: FileText },
        ] as { id: Tool; label: string; icon: React.ElementType }[]).map((t) => (
          <button key={t.id} onClick={() => setTool(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
              tool === t.id
                ? "bg-[var(--gold)] text-black border-[var(--gold)]"
                : "border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
            }`}>
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── AI CHAT ── */}
      {tool === "chat" && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4" style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}>
          {/* Sidebar: chat list */}
          <div className="lg:col-span-1 rounded-lg border border-white/10 bg-[var(--surface)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Chats</p>
              <button onClick={() => { setActiveChatId(null); setMessages([]); setInput(""); }}
                className="text-zinc-500 hover:text-[var(--gold)] transition">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {chats.length === 0 ? (
                <p className="px-4 py-6 text-xs text-zinc-600 text-center">No chats yet</p>
              ) : chats.map((chat) => (
                <div key={chat.id}
                  className={`flex items-center gap-2 px-4 py-3 cursor-pointer border-b border-white/5 hover:bg-white/5 transition group ${activeChatId === chat.id ? "bg-white/10" : ""}`}
                  onClick={() => openChat(chat.id)}>
                  <MessageSquare className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                  <p className="text-xs text-zinc-300 truncate flex-1">{chat.title}</p>
                  <button onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                    className="text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Main chat area */}
          <div className="lg:col-span-3 rounded-lg border border-white/10 bg-[var(--surface)] flex flex-col overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!activeChatId && messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                  <Bot className="h-12 w-12 text-[var(--gold)]" />
                  <div>
                    <p className="text-white font-semibold">MG AI Assistant</p>
                    <p className="text-sm text-zinc-400 mt-1">Type a message to start. Ask me to write captions, scripts, emails, reports, or anything studio-related.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {[
                      "Write an Instagram caption for a wedding shoot",
                      "Summarize this month's bookings",
                      "Write a promotional email for our packages",
                      "Create a 30-second reel script",
                    ].map((s) => (
                      <button key={s} onClick={() => setInput(s)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    msg.role === "user" ? "bg-[var(--gold)] text-black" : "bg-zinc-800 text-[var(--gold)] border border-[var(--gold)]/30"
                  }`}>
                    {msg.role === "user" ? "You" : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`rounded-xl px-4 py-3 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[var(--gold)]/15 text-white rounded-tr-sm"
                      : "bg-white/5 text-zinc-200 rounded-tl-sm border border-white/5"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-800 border border-[var(--gold)]/30 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-[var(--gold)]" />
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl rounded-tl-sm px-4 py-3">
                    <span className="flex gap-1">
                      {[0,1,2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask MG AI anything…"
                  rows={1}
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--gold)]/50 resize-none"
                />
                <button
                  onClick={activeChatId ? sendMessage : newChat}
                  disabled={loading || !input.trim()}
                  className="px-4 py-3 rounded-xl bg-[var(--gold)] text-black font-semibold hover:bg-yellow-500 disabled:opacity-40 transition"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-zinc-600 mt-2 text-center">Press Enter to send · Shift+Enter for new line</p>
            </div>
          </div>
        </div>
      )}

      {/* ── CAPTION GENERATOR ── */}
      {tool === "caption" && (
        <ToolCard title="Caption Generator" icon={Hash} onRun={runTool} loading={loading} result={result} onCopy={copyResult} copied={copied}>
          <div className="grid gap-4 grid-cols-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Subject / Topic</label>
              <input value={caption.subject} onChange={(e) => setCaption((p) => ({ ...p, subject: e.target.value }))}
                placeholder="e.g. romantic sunset wedding at Serena Hotel"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Platform</label>
              <select value={caption.platform} onChange={(e) => setCaption((p) => ({ ...p, platform: e.target.value }))}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
                {["Instagram","Facebook","TikTok","Twitter / X","LinkedIn"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Tone</label>
              <select value={caption.tone} onChange={(e) => setCaption((p) => ({ ...p, tone: e.target.value }))}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
                {["luxurious","emotional","inspirational","playful","professional","cinematic"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <button onClick={() => setCaption((p) => ({ ...p, hashtags: !p.hashtags }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${caption.hashtags ? "bg-[var(--gold)]" : "bg-zinc-700"}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${caption.hashtags ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-sm text-zinc-300">Include hashtags</span>
            </div>
          </div>
        </ToolCard>
      )}

      {/* ── SCRIPT GENERATOR ── */}
      {tool === "script" && (
        <ToolCard title="Script Writer" icon={Scissors} onRun={runTool} loading={loading} result={result} onCopy={copyResult} copied={copied}>
          <div className="grid gap-4 grid-cols-2">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Topic</label>
              <input value={script.topic} onChange={(e) => setScript((p) => ({ ...p, topic: e.target.value }))}
                placeholder="e.g. why invest in professional photography"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Script Type</label>
              <select value={script.type} onChange={(e) => setScript((p) => ({ ...p, type: e.target.value }))}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
                {["Reel","YouTube Short","Promo Video","Voice-Over","Client Testimonial Prompt","TikTok"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Duration</label>
              <select value={script.duration} onChange={(e) => setScript((p) => ({ ...p, duration: e.target.value }))}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
                {["15-second","30-second","60-second","2-minute","5-minute"].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Style</label>
              <select value={script.style} onChange={(e) => setScript((p) => ({ ...p, style: e.target.value }))}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
                {["cinematic and emotional","energetic and punchy","luxury and calm","documentary style","conversational"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </ToolCard>
      )}

      {/* ── TRANSLATE ── */}
      {tool === "translate" && (
        <ToolCard title="Content Translator" icon={Languages} onRun={runTool} loading={loading} result={result} onCopy={copyResult} copied={copied}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Target Language</label>
              <select value={translate.targetLanguage} onChange={(e) => setTranslate((p) => ({ ...p, targetLanguage: e.target.value }))}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
                {["Swahili","French","Spanish","Arabic","Portuguese","German","Chinese"].map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Content to Translate</label>
              <textarea value={translate.content} onChange={(e) => setTranslate((p) => ({ ...p, content: e.target.value }))} rows={6}
                placeholder="Paste your caption, email, script, or any text here…"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)] resize-none" />
            </div>
          </div>
        </ToolCard>
      )}

      {/* ── SUMMARIZE ── */}
      {tool === "summarize" && (
        <ToolCard title="Content Summarizer" icon={FileText} onRun={runTool} loading={loading} result={result} onCopy={copyResult} copied={copied}>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Content to Summarize</label>
            <textarea value={summarize} onChange={(e) => setSummarize(e.target.value)} rows={8}
              placeholder="Paste meeting notes, client emails, project notes, or any long-form content…"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)] resize-none" />
          </div>
        </ToolCard>
      )}
    </main>
  );
}

// ── Shared Tool Card ──────────────────────────────────────────────────────────

function ToolCard({ title, icon: Icon, onRun, loading, result, onCopy, copied, children }: {
  title: string; icon: React.ElementType;
  onRun: () => void; loading: boolean;
  result: string; onCopy: () => void; copied: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-5 w-5 text-[var(--gold)]" />
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        {children}
        <div className="flex justify-end pt-2">
          <button onClick={onRun} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--gold)] text-black font-semibold hover:bg-yellow-500 disabled:opacity-50 transition">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      {result && (
        <div className="rounded-lg border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[var(--gold)] uppercase tracking-wider">Result</p>
            <button onClick={onCopy} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition">
              {copied ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
            </button>
          </div>
          <pre className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">{result}</pre>
        </div>
      )}
    </div>
  );
}
