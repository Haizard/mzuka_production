"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, X, Send, Globe, ChevronDown, Loader2, MessageCircle } from "lucide-react";

// ── Language options ──────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "en",  label: "English",     native: "English",     flag: "🇬🇧" },
  { code: "sw",  label: "Swahili",     native: "Kiswahili",   flag: "🇹🇿" },
  { code: "ar",  label: "Arabic",      native: "العربية",     flag: "🇸🇦" },
  { code: "zh",  label: "Chinese",     native: "中文",         flag: "🇨🇳" },
  { code: "fr",  label: "French",      native: "Français",    flag: "🇫🇷" },
  { code: "rw",  label: "Kinyarwanda", native: "Kinyarwanda", flag: "🇷🇼" },
  { code: "es",  label: "Spanish",     native: "Español",     flag: "🇪🇸" },
  { code: "pt",  label: "Portuguese",  native: "Português",   flag: "🇧🇷" },
  { code: "hi",  label: "Hindi",       native: "हिन्दी",       flag: "🇮🇳" },
  { code: "de",  label: "German",      native: "Deutsch",     flag: "🇩🇪" },
];

// ── Greeting strings per language ─────────────────────────────────────────────

const GREETINGS: Record<string, string> = {
  en: "Hi! I'm **Aiko**, Muzuka Gilbert's AI assistant 👋\n\nI can help you with bookings, pricing, services, and anything else about our studio. How can I help you today?",
  sw: "Habari! Mimi ni **Aiko**, msaidizi wa AI wa Muzuka Gilbert 👋\n\nNinaweza kukusaidia na uhifadhi wa nafasi, bei, huduma, na chochote kingine kuhusu studio yetu. Je, ninaweza kukusaidiaje leo?",
  ar: "مرحباً! أنا **Aiko**، مساعد الذكاء الاصطناعي لـ Muzuka Gilbert 👋\n\nيمكنني مساعدتك في الحجوزات والأسعار والخدمات وأي شيء آخر عن الاستوديو. كيف يمكنني مساعدتك اليوم؟",
  zh: "你好！我是 **Aiko**，Muzuka Gilbert 的 AI 助手 👋\n\n我可以帮助您了解预约、价格、服务以及关于我们工作室的一切。今天有什么可以帮助您的吗？",
  fr: "Bonjour ! Je suis **Aiko**, l'assistante IA de Muzuka Gilbert 👋\n\nJe peux vous aider avec les réservations, les tarifs, les services et tout ce qui concerne notre studio. Comment puis-je vous aider aujourd'hui ?",
  rw: "Muraho! Ndi **Aiko**, umufasha wa AI wa Muzuka Gilbert 👋\n\nNshobora kukugira inama ku bibazo by'ibibazwa, ibiciro, serivisi, no ibindi byose birebana n'ishuri ryacu. Nakugira inama gute uyu munsi?",
  es: "¡Hola! Soy **Aiko**, la asistente de IA de Muzuka Gilbert 👋\n\nPuedo ayudarte con reservas, precios, servicios y todo lo relacionado con nuestro estudio. ¿En qué puedo ayudarte hoy?",
  pt: "Olá! Eu sou a **Aiko**, assistente de IA da Muzuka Gilbert 👋\n\nPosso ajudá-lo com reservas, preços, serviços e tudo mais sobre o nosso estúdio. Como posso ajudá-lo hoje?",
  hi: "नमस्ते! मैं **Aiko** हूँ, Muzuka Gilbert की AI सहायक 👋\n\nमैं बुकिंग, कीमतें, सेवाओं और हमारे स्टूडियो के बारे में हर चीज़ में आपकी मदद कर सकती हूँ। आज मैं आपकी कैसे मदद कर सकती हूँ?",
  de: "Hallo! Ich bin **Aiko**, die KI-Assistentin von Muzuka Gilbert 👋\n\nIch kann Ihnen bei Buchungen, Preisen, Dienstleistungen und allem rund um unser Studio helfen. Wie kann ich Ihnen heute helfen?",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Render markdown bold (**text**) ──────────────────────────────────────────

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ── Bubble dot animation ──────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="flex gap-1 items-center py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function SupportChat() {
  const [open, setOpen]         = useState(false);
  const [stage, setStage]       = useState<"lang" | "chat">("lang");
  const [language, setLanguage] = useState<typeof LANGUAGES[0] | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [unread, setUnread]     = useState(0);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when chat opens
  useEffect(() => {
    if (open && stage === "chat") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, stage]);

  // Reset unread when opened
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  function selectLanguage(lang: typeof LANGUAGES[0]) {
    setLanguage(lang);
    setStage("chat");
    // Add greeting message
    const greeting = GREETINGS[lang.code] ?? GREETINGS.en;
    setMessages([{ role: "assistant", content: greeting }]);
    // Nudge unread if closed
    if (!open) setUnread(1);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: ChatMessage = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const res = await fetch("/api/chat/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.slice(-12), // send last 12 messages for context (cost control)
          language: language?.label ?? "English",
        }),
      });

      const data = await res.json();
      const reply = data.reply ?? "I'm here to help!";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (!open) setUnread((n) => n + 1);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Oops, something went wrong. Please try again! 😊",
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function resetChat() {
    setStage("lang");
    setLanguage(null);
    setMessages([]);
    setInput("");
    setUnread(0);
  }

  // ── Placeholder per language ────────────────────────────────────────────────
  const PLACEHOLDERS: Record<string, string> = {
    en: "Type your message…",
    sw: "Andika ujumbe wako…",
    ar: "اكتب رسالتك…",
    zh: "输入您的消息…",
    fr: "Tapez votre message…",
    rw: "Andika ubutumwa bwawe…",
    es: "Escribe tu mensaje…",
    pt: "Digite sua mensagem…",
    hi: "अपना संदेश लिखें…",
    de: "Nachricht eingeben…",
  };

  const placeholder = language ? (PLACEHOLDERS[language.code] ?? PLACEHOLDERS.en) : PLACEHOLDERS.en;

  return (
    <>
      {/* ── Floating bubble ──────────────────────────────────────────────── */}
      <div className="fixed bottom-20 right-4 z-[9999] lg:bottom-6 lg:right-6">

        {/* Unread badge */}
        {unread > 0 && !open && (
          <span className="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg">
            {unread}
          </span>
        )}

        {/* Pulse ring when closed */}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping bg-[var(--gold)]/30 pointer-events-none" />
        )}

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close support chat" : "Open support chat"}
          className="relative h-14 w-14 rounded-full bg-[var(--gold)] text-black shadow-2xl shadow-[var(--gold)]/30 hover:bg-yellow-400 active:scale-95 transition-all flex items-center justify-center"
        >
          {open ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* ── Chat window ──────────────────────────────────────────────────── */}
      <div
        className={`fixed z-[9998] transition-all duration-300 ease-out
          bottom-[152px] right-4 w-[calc(100vw-32px)] max-w-sm
          lg:bottom-24 lg:right-6 lg:w-[380px]
          ${open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div className="flex flex-col rounded-2xl border border-white/10 bg-[var(--surface)] shadow-2xl shadow-black/60 overflow-hidden"
          style={{ height: "520px", maxHeight: "70vh" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--gold)] text-black">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-black/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-[var(--gold)] invert" style={{ filter: "invert(1)" }} />
              </div>
              <div>
                <p className="font-bold text-sm leading-none">Aiko</p>
                <p className="text-[10px] opacity-80 leading-none mt-0.5">Muzuka Gilbert · AI Support</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Language change button */}
              {stage === "chat" && language && (
                <div className="relative">
                  <button
                    onClick={() => setShowLangMenu((v) => !v)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 bg-black/10 hover:bg-black/20 transition text-xs font-medium"
                  >
                    <span>{language.flag}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showLangMenu && (
                    <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/10 bg-[var(--surface)] shadow-xl z-50 overflow-hidden">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setShowLangMenu(false);
                            resetChat();
                            // Small delay then re-select
                            setTimeout(() => selectLanguage(lang), 50);
                          }}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/5 transition text-left ${
                            lang.code === language.code ? "text-[var(--gold)]" : "text-zinc-300"
                          }`}
                        >
                          <span>{lang.flag}</span>
                          <span>{lang.native}</span>
                          {lang.code === language.code && <span className="ml-auto text-[var(--gold)]">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-black/10 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Online indicator */}
          <div className="flex items-center gap-1.5 px-4 py-1.5 bg-[var(--surface-strong)] border-b border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-zinc-500">Online · Typically replies instantly</span>
          </div>

          {/* ── Language picker stage ── */}
          {stage === "lang" && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <div className="text-center pt-2">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--gold)]/10 border border-[var(--gold)]/20 mb-3">
                  <Globe className="h-7 w-7 text-[var(--gold)]" />
                </div>
                <h3 className="font-bold text-[var(--foreground)]">Welcome to Muzuka Gilbert</h3>
                <p className="text-xs text-zinc-400 mt-1">Please choose your preferred language to continue</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => selectLanguage(lang)}
                    className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/3 px-3 py-2.5 text-left hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/5 transition group"
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <div>
                      <p className="text-xs font-semibold text-[var(--foreground)] group-hover:text-[var(--gold)] transition">{lang.native}</p>
                      {lang.native !== lang.label && (
                        <p className="text-[10px] text-zinc-500">{lang.label}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Chat stage ── */}
          {stage === "chat" && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center mt-0.5">
                        <Bot className="h-3.5 w-3.5 text-[var(--gold)]" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 max-w-[80%] text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === "user"
                          ? "bg-[var(--gold)] text-black font-medium rounded-tr-sm"
                          : "bg-white/8 text-[var(--foreground)] rounded-tl-sm border border-white/8"
                      }`}
                    >
                      {renderMarkdown(msg.content)}
                    </div>
                    {msg.role === "user" && (
                      <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center mt-0.5 text-[10px] font-bold text-[var(--gold)]">
                        U
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center">
                      <Bot className="h-3.5 w-3.5 text-[var(--gold)]" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-white/8 border border-white/8 px-4 py-3">
                      <TypingDots />
                    </div>
                  </div>
                )}

                {/* Book now CTA — shown after 2+ assistant messages */}
                {messages.filter((m) => m.role === "assistant").length >= 2 && !loading && (
                  <div className="flex justify-center pt-1">
                    <a
                      href="/register"
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/30 px-4 py-1.5 text-xs font-semibold text-[var(--gold)] hover:bg-[var(--gold)]/20 transition"
                    >
                      📅 Book a Session
                    </a>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-white/10 bg-[var(--surface)]">
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    rows={1}
                    className="flex-1 min-h-[40px] max-h-[100px] rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-[var(--foreground)] placeholder-zinc-600 focus:outline-none focus:border-[var(--gold)]/40 resize-none"
                    style={{ lineHeight: "1.4" }}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = "auto";
                      el.style.height = Math.min(el.scrollHeight, 100) + "px";
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="h-10 w-10 shrink-0 rounded-xl bg-[var(--gold)] text-black flex items-center justify-center hover:bg-yellow-400 disabled:opacity-40 transition active:scale-95"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-700 mt-1.5 text-center">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
