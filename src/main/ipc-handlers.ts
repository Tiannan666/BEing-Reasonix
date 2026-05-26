/**
 * ipc-handlers.ts — IPC handlers for the configuration wizard.
 */
import { ipcMain, dialog, BrowserWindow } from "electron";
import os from "os";

import { getApiKey, saveApiKey } from "./setup";
import { launchNativeTerminal } from "./reasonix-process";

export function registerIpcHandlers(): void {
  ipcMain.handle("api:get-key", () => getApiKey());
  ipcMain.handle("api:save-key", (_event, key: string) => saveApiKey(key));

  ipcMain.handle("app:get-home", () => os.homedir());

  ipcMain.handle("setup:save-last-cwd", (_event, cwd: string) => {
    try {
      require("fs").writeFileSync(
        require("path").join(os.homedir(), ".reasonix", ".last-cwd"),
        cwd, "utf-8"
      );
      return true;
    } catch { return false; }
  });

  ipcMain.handle("dialog:select-directory", async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
      title: "选择工作目录",
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("terminal:launch", (_event, mode: string, cwd: string, model: string) =>
    launchNativeTerminal(mode, cwd, model));
}
