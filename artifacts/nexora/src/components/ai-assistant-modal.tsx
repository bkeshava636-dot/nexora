import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from "react";
import { useLocation } from "wouter";
import {
  Bot,
  X,
  Send,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  FileText,
  Minimize2,
  Maximize2,
  Upload,
  Link2,
  GraduationCap,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  useAiChat,
  useListSubjects,
  useListSemesters,
  useListResources,
  useListQuickLinks,
  useListIaPapers,
  useListSemesterQps,
  type Subject,
  type Resource,
  type ContextState,
  type ActionCardData,
} from "@workspace/api-client-react";

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: string;
  quickReplies?: { label: string; value: string }[];
  actionCard?: ActionCardData;
  isError?: boolean;
  canRetry?: boolean;
  failedQuery?: string;
}

// ============================================================================
// 1. CODE BLOCK WITH 1-CLICK COPY
// ============================================================================
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] shadow-xs">
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.6)] px-3 py-1.5 text-[11px] font-mono text-[hsl(var(--muted-foreground))]">
        <span className="uppercase font-semibold tracking-wider text-[10px] text-[hsl(var(--secondary))]">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 hover:bg-[hsl(var(--card))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer text-[10px] font-medium"
          title="Copy code to clipboard"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[11px] font-mono leading-relaxed text-[hsl(var(--foreground))] mobile-scroll">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ============================================================================
// 2. INLINE & PROSE MARKDOWN FORMATTER
// ============================================================================
function renderInline(text: string) {
  // Tokenize bold, code, and italic formatting
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  return tokens.map((token, i) => {
    if (token.startsWith("**") && token.endsWith("**") && token.length >= 4) {
      return (
        <strong key={i} className="font-bold text-[hsl(var(--foreground))]">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("`") && token.endsWith("`") && token.length >= 2) {
      return (
        <code
          key={i}
          className="rounded-md bg-[hsl(var(--muted))] px-1.5 py-0.5 font-mono text-[11px] text-[hsl(var(--secondary))] font-semibold"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith("*") && token.endsWith("*") && token.length >= 2) {
      return (
        <em key={i} className="italic text-[hsl(var(--foreground))]">
          {token.slice(1, -1)}
        </em>
      );
    }
    return token;
  });
}

function FormattedMessage({ content }: { content: string }) {
  // Split into fenced code blocks and prose
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-1.5 leading-relaxed text-xs">
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
          const lang = match ? match[1] : "";
          const code = match ? match[2].trim() : part.slice(3, -3).trim();
          return <CodeBlock key={index} language={lang} code={code} />;
        }

        const lines = part.split("\n");
        return (
          <div key={index} className="space-y-1">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lIdx} className="h-1" />;

              if (trimmed.startsWith("### ")) {
                return (
                  <h4 key={lIdx} className="font-bold text-[13px] text-[hsl(var(--foreground))] mt-2.5 mb-1">
                    {renderInline(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith("## ")) {
                return (
                  <h3 key={lIdx} className="font-bold text-[14px] text-[hsl(var(--foreground))] mt-2.5 mb-1">
                    {renderInline(trimmed.slice(3))}
                  </h3>
                );
              }
              if (trimmed.startsWith("# ")) {
                return (
                  <h2 key={lIdx} className="font-extrabold text-[15px] text-[hsl(var(--foreground))] mt-2.5 mb-1">
                    {renderInline(trimmed.slice(2))}
                  </h2>
                );
              }
              if (trimmed.startsWith("> ")) {
                return (
                  <blockquote
                    key={lIdx}
                    className="border-l-2 border-[hsl(var(--secondary))] pl-2.5 py-0.5 my-1 text-[hsl(var(--muted-foreground))] italic bg-[hsl(var(--muted)/.2)] rounded-r-md"
                  >
                    {renderInline(trimmed.slice(2))}
                  </blockquote>
                );
              }
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                return (
                  <div key={lIdx} className="flex items-start gap-1.5 pl-1.5">
                    <span className="text-[hsl(var(--secondary))] font-bold leading-normal">•</span>
                    <span>{renderInline(trimmed.slice(2))}</span>
                  </div>
                );
              }
              const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-1.5 pl-1.5">
                    <span className="font-bold text-[hsl(var(--secondary))] shrink-0">{numMatch[1]}.</span>
                    <span>{renderInline(numMatch[2])}</span>
                  </div>
                );
              }

              return <p key={lIdx}>{renderInline(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// 3. MAIN AI ASSISTANT MODAL COMPONENT
// ============================================================================
export function AiAssistantModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [, setLocation] = useLocation();

  // Multi-turn context state across questions
  const [contextState, setContextState] = useState<ContextState>({});

  // Input & message thread state
  const [input, setInput] = useState("");
  const [loadingStep, setLoadingStep] = useState<string>("Thinking...");

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      sender: "bot",
      text: "👋 Hi! I'm your **Nexora AI Study Assistant** for BITM.\n\nAsk me for verified notes, question papers, academic explanations, or exam guidance:\n• *\"Where can I get DSA notes?\"*\n• *\"I need 3rd sem IA papers\"*\n• *\"Explain recursion in simple words\"*\n• *\"BITM results link\"*\n\nHow can I help you study today?",
      timestamp: "Just now",
      quickReplies: [
        { label: "📐 Maths Notes", value: "i need maths notes" },
        { label: "📋 3rd Sem IA Papers", value: "i need 3rd sem ia papers" },
        { label: "⚡ DSDCO Notes", value: "dsdco notes" },
        { label: "💡 Explain Recursion", value: "explain recursion in simple words" },
        { label: "📊 BITM Results Link", value: "bitm result link" },
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Backend AI Chat Mutation
  const chatMutation = useAiChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, chatMutation.isPending]);

  // Handle dynamic loading steps while request is in flight
  useEffect(() => {
    if (!chatMutation.isPending) return;
    setLoadingStep("Finding relevant resources...");
    const t1 = setTimeout(() => setLoadingStep("Analyzing academic concepts..."), 700);
    const t2 = setTimeout(() => setLoadingStep("Preparing your verified answer..."), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [chatMutation.isPending]);

  const handleActionNavigate = (targetUrl: string, external?: boolean) => {
    if (external) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } else {
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        const targetPath = targetUrl.split("?")[0];
        if (currentPath === targetPath) {
          window.location.href = targetUrl;
        } else {
          setLocation(targetUrl);
        }
      } else {
        setLocation(targetUrl);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
      setIsMinimized(true);
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const userQuery = (textToSend ?? input).trim();
    if (!userQuery || chatMutation.isPending) return;

    const userMsgId = Date.now().toString();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: userQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");

    // Build history for context (last 6 turns)
    const historyPayload = messages
      .filter((m) => m.sender === "user" || (m.sender === "bot" && !m.isError))
      .slice(-6)
      .map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

    chatMutation.mutate(
      {
        message: userQuery,
        history: historyPayload,
        contextState,
      },
      {
        onSuccess: (data) => {
          const botMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: "bot",
            text: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            actionCard: data.actionCard,
            quickReplies: data.quickReplies,
          };
          setMessages((prev) => [...prev, botMsg]);

          if (data.updatedContextState) {
            setContextState((prev) => ({
              ...prev,
              ...data.updatedContextState,
            }));
          }
        },
        onError: (err) => {
          const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: "bot",
            text: "⚠️ I encountered an issue connecting to the academic server. Please click Retry below to send your question again.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isError: true,
            canRetry: true,
            failedQuery: userQuery,
          };
          setMessages((prev) => [...prev, errorMsg]);
        },
      }
    );
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearContext = () => {
    setContextState({});
  };

  const handleResetConversation = () => {
    setMessages([
      {
        id: "welcome-reset",
        sender: "bot",
        text: "✨ Conversation reset! What subject, question paper, or academic topic can I help you find?",
        timestamp: "Just now",
        quickReplies: [
          { label: "📐 Maths Notes", value: "i need maths notes" },
          { label: "📋 3rd Sem IA Papers", value: "i need 3rd sem ia papers" },
          { label: "⚡ DSDCO Notes", value: "dsdco notes" },
          { label: "💡 Explain Recursion", value: "explain recursion in simple words" },
          { label: "📊 BITM Results Link", value: "bitm result link" },
        ],
      },
    ]);
    setContextState({});
  };

  const hasActiveContext = Boolean(
    contextState.subject || contextState.semester || contextState.branch
  );

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className="focus-ring relative inline-flex items-center gap-2 rounded-full border border-[hsl(var(--secondary)/.4)] bg-gradient-to-r from-[hsl(var(--card))] via-[hsl(var(--card))] to-[hsl(var(--secondary)/.15)] px-4 py-2.5 text-xs font-bold text-[hsl(var(--foreground))] shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:border-[hsl(var(--secondary))] hover:shadow-2xl cursor-pointer active:scale-95 group"
        aria-label="Ask Nexora AI Assistant"
        data-testid="button-floating-ai-assistant"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-xs group-hover:rotate-6 transition-transform">
          <Bot size={15} strokeWidth={2.5} />
        </span>
        <span className="hidden sm:inline">Ask AI Assistant</span>
        <span className="sm:hidden">AI Bot</span>
      </button>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] backdrop-blur-2xl ${
            isMinimized
              ? "bottom-5 right-20 w-72 h-14 rounded-2xl shadow-xl overflow-hidden"
              : isMaximized
              ? "inset-2 sm:inset-6 rounded-3xl shadow-2xl flex flex-col"
              : "bottom-5 right-3 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-[440px] h-[620px] max-h-[88vh] rounded-3xl shadow-2xl flex flex-col"
          }`}
          role="dialog"
          aria-labelledby="ai-assistant-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] px-4 py-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] shadow-sm">
                <Bot size={17} strokeWidth={2.4} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 id="ai-assistant-title" className="text-xs font-bold text-[hsl(var(--foreground))]">
                    Nexora AI Assistant
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Online
                  </span>
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                  Study companion & verified resource finder
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetConversation}
                className="focus-ring rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <RotateCcw size={14} />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isMinimized) {
                    setIsMinimized(false);
                  } else {
                    setIsMaximized(!isMaximized);
                  }
                }}
                className="focus-ring rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                title={isMaximized ? "Restore standard size" : "Expand view"}
                aria-label={isMaximized ? "Restore standard size" : "Expand view"}
              >
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="focus-ring rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                title="Close assistant"
                aria-label="Close assistant"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Active Conversation Context Pill (Context Memory) */}
          {!isMinimized && hasActiveContext && (
            <div className="flex items-center justify-between border-b border-[hsl(var(--border)/.6)] bg-[hsl(var(--muted)/.25)] px-3.5 py-1.5 text-[10px]">
              <div className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] truncate">
                <Sparkles size={11} className="text-[hsl(var(--secondary))] shrink-0" />
                <span className="font-semibold text-[hsl(var(--foreground))]">Active Context:</span>
                <span className="truncate">
                  {[contextState.branch, contextState.semester, contextState.subject]
                    .filter(Boolean)
                    .join(" • ")}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearContext}
                className="ml-2 text-[10px] font-semibold text-[hsl(var(--secondary))] hover:underline shrink-0"
                title="Clear current topic filter"
              >
                Clear
              </button>
            </div>
          )}

          {/* Body when expanded */}
          {!isMinimized && (
            <>
              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 mobile-scroll text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-xs ${
                        msg.sender === "user"
                          ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-tr-xs"
                          : msg.isError
                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 rounded-tl-xs"
                          : "bg-[hsl(var(--muted)/.65)] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] rounded-tl-xs"
                      }`}
                    >
                      <FormattedMessage content={msg.text} />

                      {/* Manual Retry Action Button on Error */}
                      {msg.canRetry && msg.failedQuery && (
                        <div className="mt-2.5 pt-2 border-t border-rose-500/20">
                          <button
                            type="button"
                            onClick={() => handleSendMessage(msg.failedQuery)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer shadow-xs transition-colors"
                          >
                            <RefreshCw size={12} />
                            <span>Retry Question</span>
                          </button>
                        </div>
                      )}

                      {/* Action Card inside Bot Message */}
                      {msg.actionCard && (
                        <div className="mt-3 overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-sm text-left">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              {msg.actionCard.badge && (
                                <span className="inline-block rounded-md bg-[hsl(var(--secondary)/.15)] px-1.5 py-0.5 text-[9px] font-bold text-[hsl(var(--secondary))] uppercase tracking-wider mb-1">
                                  {msg.actionCard.badge}
                                </span>
                              )}
                              <h4 className="font-bold text-xs text-[hsl(var(--foreground))]">
                                {msg.actionCard.title}
                              </h4>
                              {msg.actionCard.subtitle && (
                                <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                                  {msg.actionCard.subtitle}
                                </p>
                              )}
                            </div>
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--secondary))]">
                              <BookOpen size={14} />
                            </div>
                          </div>

                          {/* Direct Verified Resources Preview */}
                          {msg.actionCard.resources && msg.actionCard.resources.length > 0 && (
                            <div className="my-2 divide-y divide-[hsl(var(--border)/.6)] rounded-lg border border-[hsl(var(--border)/.6)] bg-[hsl(var(--muted)/.2)] px-2">
                              {msg.actionCard.resources.map((r, idx) => (
                                <div key={idx} className="flex items-center justify-between py-1.5 text-[10px]">
                                  <span className="truncate pr-2 text-[hsl(var(--foreground))] font-medium flex items-center gap-1">
                                    <FileText size={11} className="text-[hsl(var(--secondary))] shrink-0" />
                                    <span className="truncate">{r.title}</span>
                                  </span>
                                  {r.url && (
                                    <a
                                      href={r.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0 text-[hsl(var(--primary))] font-bold hover:underline ml-2"
                                    >
                                      Open ↗
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              handleActionNavigate(
                                msg.actionCard!.targetUrl,
                                msg.actionCard!.external
                              )
                            }
                            className="focus-ring mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-3 py-2 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                          >
                            <span>{msg.actionCard.buttonText}</span>
                            {msg.actionCard.external ? <ExternalLink size={12} /> : <ArrowRight size={12} />}
                          </button>
                        </div>
                      )}
                    </div>

                    <span className="mt-1 px-1 text-[9px] text-[hsl(var(--muted-foreground)/.7)]">
                      {msg.timestamp}
                    </span>

                    {/* Quick Replies Buttons */}
                    {msg.quickReplies && msg.quickReplies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 max-w-[95%]">
                        {msg.quickReplies.map((reply, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSendMessage(reply.value)}
                            className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-1 text-[10.5px] font-semibold text-[hsl(var(--foreground))] shadow-xs hover:border-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary)/.08)] hover:text-[hsl(var(--secondary))] transition-colors cursor-pointer"
                          >
                            <span>{reply.label}</span>
                            <ChevronRight size={10} className="opacity-60" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator with status message */}
                {chatMutation.isPending && (
                  <div className="flex flex-col items-start space-y-1">
                    <div className="flex items-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.65)] px-3.5 py-2 text-xs shadow-xs">
                      <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[hsl(var(--secondary))] [animation-delay:-0.3s]"></span>
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[hsl(var(--secondary))] [animation-delay:-0.15s]"></span>
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[hsl(var(--secondary))]"></span>
                      </div>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-medium">
                        {loadingStep}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-end gap-2"
                >
                  <div className="relative flex-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/.4)] focus-within:border-[hsl(var(--primary))] transition-colors">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        hasActiveContext
                          ? `Ask follow-up for ${[contextState.semester, contextState.subject].filter(Boolean).join(" ")}...`
                          : "Ask for notes, question papers, or explain concepts..."
                      }
                      rows={1}
                      disabled={chatMutation.isPending}
                      className="w-full resize-none bg-transparent px-3 py-2 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-hidden max-h-24 min-h-[38px]"
                      style={{ height: "auto" }}
                      aria-label="Ask study assistant"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!input.trim() || chatMutation.isPending}
                    className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Send message"
                  >
                    {chatMutation.isPending ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Send size={15} />
                    )}
                  </button>
                </form>

                <div className="mt-1.5 flex items-center justify-between px-1 text-[9px] text-[hsl(var(--muted-foreground))]">
                  <span>Press ↵ to send • Shift+↵ for new line</span>
                  <span>BITM Academic Companion</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
