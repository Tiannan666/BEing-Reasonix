/**
 * preload/index.ts — Secure contextBridge API exposed to the renderer.
 *
 * Every method here is a thin wrapper over ipcRenderer.invoke / .on / .send.
 * The renderer never has direct access to Node.js or Electron APIs.
 */
import { contextBridge, ipcRenderer } from "electron";

// Re-export types for the renderer's global declaration
export interface PromptInfo {
  type: "confirm" | "choice" | "path";
  message: string;
  choices?: string[];
  defaultValue?: string;
}

export interface HistoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface ConversationMeta {
  id: string;
  skill: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface BalanceResult {
  total: number;
  used: number;
  currency: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const api = {
  // ── API Key ──────────────────────────────────────────────────
  getApiKey: (): Promise<string | null> => ipcRenderer.invoke("api:get-key"),
  saveApiKey: (key: string): Promise<boolean> =>
    ipcRenderer.invoke("api:save-key", key),

  // ── Setup / First Run ────────────────────────────────────────
  isFirstRun: (): Promise<boolean> => ipcRenderer.invoke("setup:is-first-run"),
  markSetupDone: (): Promise<boolean> => ipcRenderer.invoke("setup:mark-done"),
  getLastCwd: (): Promise<string | null> =>
    ipcRenderer.invoke("setup:get-last-cwd"),
  saveLastCwd: (cwd: string): Promise<boolean> =>
    ipcRenderer.invoke("setup:save-last-cwd", cwd),

  // ── Session ──────────────────────────────────────────────────
  startSession: (mode: "code" | "chat", cwd: string, skill?: string): Promise<boolean> =>
    ipcRenderer.invoke("session:start", mode, cwd, skill),
  stopSession: (): Promise<boolean> => ipcRenderer.invoke("session:stop"),
  getSessionInfo: (): Promise<{ mode: string; cwd: string } | null> =>
    ipcRenderer.invoke("session:info"),

  // ── Terminal I/O ─────────────────────────────────────────────
  sendInput: (data: string): void => ipcRenderer.send("terminal:input", data),

  // ── Output Events ────────────────────────────────────────────
  onOutput: (callback: (data: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: string) =>
      callback(data);
    ipcRenderer.on("reasonix:output", handler);
    return () => ipcRenderer.removeListener("reasonix:output", handler);
  },

  onExited: (
    callback: (info: { exitCode: number; signal?: number }) => void
  ): (() => void) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      info: { exitCode: number; signal?: number }
    ) => callback(info);
    ipcRenderer.on("reasonix:exited", handler);
    return () => ipcRenderer.removeListener("reasonix:exited", handler);
  },

  onStats: (
    callback: (stats: { cache?: string; context?: string; balance?: string }) => void
  ): (() => void) => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      stats: { cache?: string; context?: string; balance?: string }
    ) => callback(stats);
    ipcRenderer.on("reasonix:stats", handler);
    return () => ipcRenderer.removeListener("reasonix:stats", handler);
  },

  // ── Chat Streaming ───────────────────────────────────────────
  streamChat: (messages: ChatMessage[], model: string): void =>
    ipcRenderer.send("chat:stream", messages, model),

  onChatToken: (callback: (token: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, token: string) =>
      callback(token);
    ipcRenderer.on("chat:token", handler);
    return () => ipcRenderer.removeListener("chat:token", handler);
  },

  onChatDone: (callback: () => void): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on("chat:done", handler);
    return () => ipcRenderer.removeListener("chat:done", handler);
  },

  onChatError: (callback: (err: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, err: string) =>
      callback(err);
    ipcRenderer.on("chat:error", handler);
    return () => ipcRenderer.removeListener("chat:error", handler);
  },

  // ── Code Mode ────────────────────────────────────────────────
  startCode: (cwd: string, skill?: string): Promise<boolean> =>
    ipcRenderer.invoke("code:start", cwd, skill),
  codeInput: (text: string): void => ipcRenderer.send("code:input", text),
  codePause: (): void => ipcRenderer.send("code:pause"),

  // ── Directory Picker ─────────────────────────────────────────
  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke("dialog:select-directory"),

  // ── Skills ───────────────────────────────────────────────────
  listSkills: (cwd: string): Promise<string[]> =>
    ipcRenderer.invoke("skill:list", cwd),

  // ── Balance ──────────────────────────────────────────────────
  fetchBalance: (): Promise<BalanceResult | null> =>
    ipcRenderer.invoke("balance:fetch"),

  // ── Home Dir ─────────────────────────────────────────────────
  getHome: (): Promise<string> => ipcRenderer.invoke("app:get-home"),

  // ── History ──────────────────────────────────────────────────
  listConversations: (skill: string): Promise<ConversationMeta[]> =>
    ipcRenderer.invoke("history:list", skill),
  loadConversation: (
    skill: string,
    id: string
  ): Promise<HistoryMessage[]> =>
    ipcRenderer.invoke("history:load", skill, id),
  createConversation: (skill: string): Promise<string> =>
    ipcRenderer.invoke("history:create", skill),
  appendMessages: (
    skill: string,
    id: string,
    messages: HistoryMessage[]
  ): Promise<boolean> =>
    ipcRenderer.invoke("history:append", skill, id, messages),
  deleteConversation: (skill: string, id: string): Promise<boolean> =>
    ipcRenderer.invoke("history:delete", skill, id),

};

contextBridge.exposeInMainWorld("electronAPI", api);
