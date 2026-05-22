/**
 * deepseek-api.ts — DeepSeek API client.
 *
 * Provides streaming chat completions and balance queries.
 * All calls go through the Electron main process so the API key
 * never reaches the renderer.
 */
import { getApiKey } from "./setup";

const DEEPSEEK_BASE = "https://api.deepseek.com";

// ── Chat Streaming ───────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function streamChat(
  messages: ChatMessage[],
  model: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    onError("No API key configured. Please set your DeepSeek API key first.");
    return;
  }

  try {
    const resp = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream: true }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      onError(`API error ${resp.status}: ${text}`);
      return;
    }

    const reader = resp.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          onDone();
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) onToken(delta);
        } catch {
          // skip malformed SSE lines
        }
      }
    }
    onDone();
  } catch (err: unknown) {
    onError(err instanceof Error ? err.message : String(err));
  }
}

// ── Balance ──────────────────────────────────────────────────────

interface DeepSeekBalanceInfo {
  currency: string;
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
}

interface DeepSeekBalanceResponse {
  is_available: boolean;
  balance_infos: DeepSeekBalanceInfo[];
}

export interface BalanceResult {
  total: number;
  used: number;
  currency: string;
}

export async function fetchBalance(): Promise<BalanceResult | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const resp = await fetch(`${DEEPSEEK_BASE}/user/balance`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!resp.ok) return null;

    const data: DeepSeekBalanceResponse = await resp.json();
    const info =
      data.balance_infos?.find((b) => b.currency === "CNY") ||
      data.balance_infos?.[0];
    if (!info) return null;

    const total = parseFloat(info.total_balance);
    const granted = parseFloat(info.granted_balance);
    const toppedUp = parseFloat(info.topped_up_balance);
    const used = Math.max(0, granted + toppedUp - total);

    return { total, used, currency: info.currency };
  } catch {
    return null;
  }
}
