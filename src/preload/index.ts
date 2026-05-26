import { contextBridge, ipcRenderer } from "electron";

export interface ElectronAPI {
  getApiKey: () => Promise<string | null>;
  saveApiKey: (key: string) => Promise<boolean>;
  getHome: () => Promise<string>;
  selectDirectory: () => Promise<string | null>;
  saveLastCwd: (cwd: string) => Promise<void>;
  launchTerminal: (mode: string, cwd: string, model: string) => Promise<boolean>;
}

contextBridge.exposeInMainWorld("electronAPI", {
  getApiKey: () => ipcRenderer.invoke("api:get-key"),
  saveApiKey: (key: string) => ipcRenderer.invoke("api:save-key", key),
  getHome: () => ipcRenderer.invoke("app:get-home"),
  selectDirectory: () => ipcRenderer.invoke("dialog:select-directory"),
  saveLastCwd: (cwd: string) => ipcRenderer.invoke("setup:save-last-cwd", cwd),
  launchTerminal: (mode: string, cwd: string, model: string) =>
    ipcRenderer.invoke("terminal:launch", mode, cwd, model),
} satisfies ElectronAPI);
