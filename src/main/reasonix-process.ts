/**
 * reasonix-process.ts — Reasonix lifecycle management.
 *
 * Ensures Node.js and Reasonix are installed, then launches
 * a native cmd.exe window running Reasonix directly.
 */
import { execSync, spawn as cpSpawn } from "child_process";
import { app } from "electron";
import path from "path";
import fs from "fs";
import os from "os";

// ── Helpers ──────────────────────────────────────────────────────

function isPackaged(): boolean {
  return app.isPackaged;
}

function getNodePath(): string {
  if (isPackaged()) {
    const name = process.platform === "win32" ? "node.exe" : "node";
    const p = path.join(process.resourcesPath, "vendor", "node",
      `${process.platform}-${process.arch === "arm64" ? "arm64" : "x64"}`, name);
    if (fs.existsSync(p)) return p;
  }
  return "node";
}

function getGlobalReasonixPath(): string | null {
  try {
    const root = execSync("npm root -g", { encoding: "utf-8", timeout: 5000 }).trim();
    const p = path.join(root, "reasonix", "dist", "cli", "index.js");
    if (fs.existsSync(p)) return p;
  } catch { /* no npm */ }
  return null;
}

// ── Public API ───────────────────────────────────────────────────

export function ensureReasonixInstalled(): boolean {
  // PATH check first
  try {
    execSync("reasonix --version", { encoding: "utf-8", timeout: 5000, stdio: "pipe" });
    return true;
  } catch { /* not in PATH */ }

  // Check global npm install
  const gPath = getGlobalReasonixPath();
  if (gPath && fs.existsSync(gPath)) return true;

  // Install globally
  try {
    execSync("npm install -g reasonix", { encoding: "utf-8", timeout: 120_000, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export function ensureNodeJs(): void {
  try {
    const v = execSync("node --version", { encoding: "utf-8", timeout: 5000 }).trim();
    const major = parseInt(v.replace(/^v/, "").split(".")[0], 10);
    if (major >= 22) return;
  } catch { /* not found */ }

  if (!isPackaged()) return;

  const dir = path.join(process.resourcesPath, "vendor", "node-installer");
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".msi"));
  if (files.length === 0) return;

  try {
    execSync(`msiexec /i "${path.join(dir, files[0])}" /quiet /norestart`, {
      timeout: 120_000, stdio: "pipe",
    });
  } catch { /* silent — bundled node.exe still works */ }
}

/**
 * Launch a native cmd.exe window running Reasonix.
 * Uses cwd to set the working directory — no path arg, avoiding all quoting issues.
 */
export function launchNativeTerminal(mode: string, cwd: string, model: string): boolean {
  const dir = (cwd || os.homedir()).replace(/\\+$/, "");

  if (!ensureReasonixInstalled()) {
    console.error("[BEing] reasonix not found and install failed");
    return false;
  }

  // No path argument — Reasonix reads working directory from cmd's cwd
  const cmdLine = mode === "code" ? "reasonix code" : "reasonix chat";

  try {
    cpSpawn("cmd.exe", ["/k", cmdLine], {
      cwd: dir, detached: true, stdio: "ignore", windowsHide: false,
    }).unref();
    setTimeout(() => app.quit(), 500);
    return true;
  } catch (err) {
    console.error("[BEing] failed to launch terminal:", err);
    return false;
  }
}
