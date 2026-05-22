/**
 * global.d.ts — Global type declarations for the renderer process.
 *
 * Declares window.electronAPI exposed by the preload script via contextBridge.
 */
import type { ElectronAPI } from "../preload/index";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
