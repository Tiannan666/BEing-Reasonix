/**
 * ipc-handlers.ts — Register all IPC handlers for main↔renderer communication.
 *
 * Channels:
 *   api:*           — API key management
 *   setup:*         — first-run / last-cwd
 *   session:*       — Reasonix PTY lifecycle
 *   terminal:*      — realtime I/O (send input, respond to prompts)
 *   dialog:*        — native dialog (directory picker)
 *   skill:*         — skill discovery
 *   balance:*       — DeepSeek balance query
 *   history:*       — conversation persistence
 *   cache:*         — cache management
 *   code:*          — code-mode shortcuts
 *   chat:*          — chat-mode streaming
 */
import { ipcMain, dialog, BrowserWindow } from "electron";
import { existsSync, readdirSync } from "fs";
import path from "path";
import os from "os";

import { getApiKey, saveApiKey, isFirstRun, markFirstRunDone, getLastCwd, saveLastCwd } from "./setup";
import {
  startSession,
  stopSession,
  sendInput,
  getSessionInfo,
  launchNativeTerminal,
  ReasonixMode,
} from "./reasonix-process";
import { streamChat, fetchBalance, ChatMessage } from "./deepseek-api";
import {
  listConversations,
  loadConversation,
  createConversation,
  appendMessages,
  deleteConversation,
  HistoryMessage,
} from "./history-store";

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Scan known directories for installed Reasonix / Claude skills.
 * Returns sorted unique skill names.
 */
function scanSkills(cwd: string): string[] {
  const names = new Set<string>();

  const dirs = [
    path.join(os.homedir(), ".reasonix", "skills"),
    path.join(cwd, ".reasonix", "skills"),
    path.join(os.homedir(), ".claude", "skills"),
    path.join(cwd, ".claude", "skills"),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const skillFile = path.join(dir, entry.name, "SKILL.md");
          if (existsSync(skillFile)) names.add(entry.name);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          names.add(entry.name.replace(/\.md$/, ""));
        }
      }
    } catch {
      // skip inaccessible directories
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}

// ── Registration ─────────────────────────────────────────────────

export function registerIpcHandlers(): void {
  // ── API Key ──────────────────────────────────────────────────
  ipcMain.handle("api:get-key", () => getApiKey());
  ipcMain.handle("api:save-key", (_event, key: string) => saveApiKey(key));

  // ── Setup / First Run ────────────────────────────────────────
  ipcMain.handle("setup:is-first-run", () => isFirstRun());
  ipcMain.handle("setup:mark-done", () => {
    markFirstRunDone();
    return true;
  });
  ipcMain.handle("setup:get-last-cwd", () => getLastCwd());
  ipcMain.handle("setup:save-last-cwd", (_event, cwd: string) => {
    saveLastCwd(cwd);
    return true;
  });

  // ── Session ──────────────────────────────────────────────────
  ipcMain.handle(
    "session:start",
    (_event, mode: ReasonixMode, cwd: string, skill?: string) => {
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return false;
      startSession(mode, cwd, win, skill);
      return true;
    }
  );
  ipcMain.handle("session:stop", () => {
    stopSession();
    return true;
  });
  ipcMain.handle("session:info", () => getSessionInfo());

  // ── Terminal I/O ─────────────────────────────────────────────
  ipcMain.on("terminal:input", (_event, data: string) => {
    sendInput(data);
  });

  // ── Directory Picker ─────────────────────────────────────────
  ipcMain.handle("dialog:select-directory", async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
      title: "选择工作目录 — Select Working Directory",
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // ── Skills ───────────────────────────────────────────────────
  ipcMain.handle("skill:list", (_event, cwd: string) => scanSkills(cwd));

  // ── Balance ──────────────────────────────────────────────────
  ipcMain.handle("balance:fetch", async () => fetchBalance());

  // ── Home Directory ───────────────────────────────────────────
  ipcMain.handle("app:get-home", () => os.homedir());

  // ── History ──────────────────────────────────────────────────
  ipcMain.handle(
    "history:list",
    (_event, skill: string) => listConversations(skill)
  );
  ipcMain.handle(
    "history:load",
    (_event, skill: string, id: string) => loadConversation(skill, id)
  );
  ipcMain.handle(
    "history:create",
    (_event, skill: string) => createConversation(skill)
  );
  ipcMain.handle(
    "history:append",
    (
      _event,
      skill: string,
      id: string,
      messages: HistoryMessage[]
    ) => {
      appendMessages(skill, id, messages);
      return true;
    }
  );
  ipcMain.handle(
    "history:delete",
    (_event, skill: string, id: string) => deleteConversation(skill, id)
  );

  // ── Launch native terminal ──────────────────────────────────
  ipcMain.handle("terminal:launch", (_event, mode: string, cwd: string, model: string) => {
    return launchNativeTerminal(mode, cwd, model);
  });

  // ── Code Mode ────────────────────────────────────────────────
  ipcMain.handle(
    "code:start",
    (_event, cwd: string, skill?: string) => {
      const win = BrowserWindow.getFocusedWindow();
      if (!win) return false;
      startSession("code", cwd, win, skill);
      return true;
    }
  );
  ipcMain.on("code:input", (_event, text: string) => {
    sendInput(text);
  });
  ipcMain.on("code:pause", () => {
    // Ctrl+C to interrupt
    sendInput("\x03");
  });

  // ── Chat Mode Streaming ──────────────────────────────────────
  ipcMain.on(
    "chat:stream",
    (event, messages: ChatMessage[], model: string) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return;

      streamChat(
        messages,
        model,
        (token) => win.webContents.send("chat:token", token),
        () => win.webContents.send("chat:done"),
        (err) => win.webContents.send("chat:error", err)
      );
    }
  );
}
