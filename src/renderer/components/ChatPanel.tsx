/**
 * ChatPanel.tsx — Main conversation area.
 *
 * Displays messages as bubbles, handles input via the input bar,
 * supports streaming token-by-token display, and provides a stop button.
 *
 * Two modes:
 *  - Code: input goes to Reasonix PTY, output displayed from PTY stream
 *  - Chat: input goes to DeepSeek API directly, streaming tokens
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Square } from "lucide-react";

const api = window.electronAPI;

interface Message {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
}

interface Props {
  mode: "code" | "chat";
  cwd: string;
  onStats?: (stats: { cache?: string; context?: string }) => void;
  onFirstMessage?: () => void;
}

export default function ChatPanel({
  mode,
  cwd,
  onStats,
  onFirstMessage,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamBuffer = useRef("");
  const hasSentMessage = useRef(false);
  const nextId = useRef(1);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Code mode: PTY output listener ────────────────────────────
  useEffect(() => {
    if (mode !== "code") return;

    const unsubOutput = api.onOutput((text: string) => {
      // Filter banner-like lines even at renderer level (belt and suspenders)
      if (!hasSentMessage.current && isBannerLike(text)) return;

      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          copy[copy.length - 1] = { ...last, content: last.content + text };
        } else {
          copy.push({
            id: nextId.current++,
            role: "assistant",
            content: text,
          });
        }
        return copy;
      });
      // Keep busy=true while streaming — only session exit stops it
    });

    const unsubExited = api.onExited(() => {
      setBusy(false);
    });

    const unsubStats = api.onStats((s: { cache?: string; context?: string }) => onStats?.(s));

    return () => {
      unsubOutput();
      unsubExited();
      unsubStats();
    };
  }, [mode, onStats]);

  // ── Chat mode: token listener ─────────────────────────────────
  useEffect(() => {
    if (mode !== "chat") return;

    const unsubToken = api.onChatToken((token: string) => {
      streamBuffer.current += token;
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          copy[copy.length - 1] = { ...last, content: streamBuffer.current };
        }
        return copy;
      });
    });

    const unsubDone = api.onChatDone(() => {
      streamBuffer.current = "";
      setBusy(false);
    });

    const unsubError = api.onChatError((err: string) => {
      setError(err);
      setBusy(false);
    });

    return () => {
      unsubToken();
      unsubDone();
      unsubError();
    };
  }, [mode]);

  // ── Send ──────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || busy) return;

    setError(null);

    const userMsg: Message = {
      id: nextId.current++,
      role: "user",
      content: trimmed,
    };

    if (mode === "chat") {
      // Chat mode: direct API streaming
      const assistantMsg: Message = {
        id: nextId.current++,
        role: "assistant",
        content: "",
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setBusy(true);
      streamBuffer.current = "";

      // Pass full message history (including the new user message)
      const allMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      api.streamChat(allMessages, "deepseek-chat");
    } else {
      // Code mode: send to Reasonix PTY (session already started by App.tsx)
      hasSentMessage.current = true;
      onFirstMessage?.();
      setMessages((prev) => [...prev, userMsg]);
      setBusy(true);

      api.codeInput(trimmed);
    }

    setInput("");
    inputRef.current?.focus();
  }, [input, busy, mode, messages, cwd]);

  // ── Stop ──────────────────────────────────────────────────────
  const handleStop = () => {
    if (mode === "code") {
      api.codePause(); // sends Ctrl+C (0x03)
    }
    // For chat mode, there's no way to cancel a fetch mid-stream
    // but we stop the busy state so UI unblocks
    setBusy(false);
  };

  // ── Keyboard ──────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.length === 0 && !busy && (
          <div className="chat-empty">
            {mode === "code"
              ? "选择一个目录，输入任务描述开始工作"
              : "开始一段对话"}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message chat-message--${msg.role}`}>
            <div className="chat-bubble">
              <div
                className="chat-bubble-text"
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily:
                    msg.role === "assistant" && mode === "code"
                      ? "var(--font-mono)"
                      : "var(--font-sans)",
                  fontSize: msg.role === "assistant" && mode === "code" ? "12px" : "13px",
                }}
              >
                {msg.content || (busy && msg.role === "assistant" ? "..." : "")}
              </div>
            </div>
          </div>
        ))}

        {busy && mode === "code" && messages.length === 0 && (
          <div className="chat-message chat-message--assistant">
            <div className="chat-bubble">
              <div className="chat-bubble-text" style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                正在启动 Reasonix...
              </div>
            </div>
          </div>
        )}

        {error && <div className="chat-error">{error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar">
        <input
          ref={inputRef}
          className="chat-input-field"
          type="text"
          placeholder={
            mode === "code"
              ? "描述你想要完成的任务... (Enter 发送)"
              : "输入消息... (Enter 发送)"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
        />
        {busy ? (
          <button
            className="chat-stop-button"
            onClick={handleStop}
            title="停止生成"
          >
            <Square size={14} strokeWidth={2} />
          </button>
        ) : (
          <button
            className="chat-send-button"
            onClick={handleSend}
            disabled={!input.trim()}
            title="发送"
          >
            <Send size={15} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Renderer-side banner filter — catches anything the main process missed. */
function isBannerLike(text: string): boolean {
  if (/[╭╮╰╯│─├┤┬┴┼]/.test(text)) return true;
  if (/REASONIX/.test(text) && /DeepSeek/.test(text)) return true;
  if (/原生代码智能体/.test(text)) return true;
  if (/缓存优先/.test(text)) return true;
  if (/\/help\s+\/init/.test(text)) return true;
  if (/^\s*▸\s*工作区/.test(text)) return true;
  if (/^\s*▸\s*网页/.test(text)) return true;
  if (/输入消息以开始/.test(text)) return true;
  return false;
}
