/**
 * reasonix-process.ts — Simple Reasonix PTY manager.
 *
 * Starts Reasonix in a PTY, forwards raw output to renderer,
 * and writes user keystrokes back to the PTY.
 * No prompt detection, no banner filtering — the terminal handles it all.
 */
import { IPty, spawn } from "node-pty";
import { BrowserWindow, app } from "electron";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

export type ReasonixMode = "code" | "chat";

interface SessionState {
  pty: IPty;
  mode: ReasonixMode;
  cwd: string;
}

let session: SessionState | null = null;

// ── Helpers ──────────────────────────────────────────────────────

function isPackaged(): boolean {
  return app.isPackaged;
}

function getPlatformKey(): string {
  return `${process.platform}-${process.arch === "arm64" ? "arm64" : "x64"}`;
}

function getNodePath(): string {
  if (isPackaged()) {
    const name = process.platform === "win32" ? "node.exe" : "node";
    const p = path.join(process.resourcesPath, "vendor", "node", getPlatformKey(), name);
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

  for (const d of [
    path.join(os.homedir(), ".npm-global", "lib", "node_modules"),
    "/usr/local/lib/node_modules",
    "/usr/lib/node_modules",
    process.platform === "win32" ? path.join(process.env.APPDATA || "", "npm", "node_modules") : "",
  ]) {
    if (!d) continue;
    const p = path.join(d, "reasonix", "dist", "cli", "index.js");
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function getReasonixCliPath(): string {
  // 1. Global install
  const g = getGlobalReasonixPath();
  if (g) return g;

  // 2. Try require.resolve (works with asar) to find the CLI entry
  try {
    const resolved = require.resolve("reasonix/dist/cli/index", {
      paths: isPackaged()
        ? [path.join(process.resourcesPath, "node_modules"), path.join(process.resourcesPath, "app.asar", "node_modules")]
        : [path.join(__dirname, "..", "..", "..", "node_modules")],
    });
    if (fs.existsSync(resolved)) return resolved;
  } catch { /* not found via require */ }

  // 3. Fallback: search known paths
  const candidates: string[] = [];
  if (isPackaged()) {
    candidates.push(
      path.join(process.resourcesPath, "node_modules", "reasonix", "dist", "cli", "index.js"),
      path.join(process.resourcesPath, "app.asar", "node_modules", "reasonix", "dist", "cli", "index.js"),
      path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "reasonix", "dist", "cli", "index.js"),
    );
  }
  candidates.push(
    path.join(__dirname, "..", "..", "..", "node_modules", "reasonix", "dist", "cli", "index.js"),
  );

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  // Last resort
  return candidates[0];
}

// ── Public API ───────────────────────────────────────────────────

export function ensureReasonixInstalled(): boolean {
  if (getReasonixCliPath() && fs.existsSync(getReasonixCliPath())) return true;
  try {
    execSync("npm install -g reasonix", { encoding: "utf-8", timeout: 120_000, stdio: "pipe" });
    return !!getGlobalReasonixPath();
  } catch {
    return false;
  }
}

/**
 * Launch a native PowerShell window running Reasonix.
 * Returns true if the process was spawned successfully.
 */
export function launchNativeTerminal(mode: string, cwd: string, model: string): boolean {
  const nodePath = getNodePath();
  const cliPath = getReasonixCliPath();
  if (!fs.existsSync(cliPath)) return false;

  const args = mode === "code"
    ? [cliPath, "code", cwd || os.homedir()]
    : [cliPath, "chat"];

  // Build a PowerShell command that changes to the directory and runs Reasonix
  const psCmd = `cd "${cwd || os.homedir()}" ; & "${nodePath}" ${args.map(a => `"${a}"`).join(" ")} ; Read-Host "Press Enter to exit"`;

  try {
    const { spawn } = require("child_process");
    spawn("powershell.exe", ["-NoExit", "-Command", psCmd], {
      detached: true,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/** Check system Node.js >= 22. If missing, install from bundled MSI. */
export function ensureNodeJs(): void {
  try {
    const v = execSync("node --version", { encoding: "utf-8", timeout: 5000 }).trim();
    const major = parseInt(v.replace(/^v/, "").split(".")[0], 10);
    if (major >= 22) return; // already OK
  } catch { /* node not in PATH */ }

  // Try to install from bundled MSI
  if (!isPackaged()) return; // dev mode — assume dev has Node

  const installerDir = path.join(process.resourcesPath, "vendor", "node-installer");
  if (!fs.existsSync(installerDir)) return;

  const files = fs.readdirSync(installerDir).filter((f) => f.endsWith(".msi"));
  if (files.length === 0) return;

  try {
    execSync(`msiexec /i "${path.join(installerDir, files[0])}" /quiet /norestart`, {
      timeout: 120_000,
      stdio: "pipe",
    });
  } catch { /* silent fail — bundled node.exe still works */ }
}

export function startSession(
  mode: ReasonixMode,
  cwd: string,
  window: BrowserWindow,
  skill?: string
): void {
  if (session) stopSession();

  const nodePath = getNodePath();
  const cliPath = getReasonixCliPath();

  if (!fs.existsSync(cliPath)) {
    if (!window.isDestroyed()) {
      window.webContents.send("reasonix:output",
        `\r\n\x1b[31m[BEing Reasonix] 找不到 Reasonix CLI。\r\n` +
        `请确保 reasonix 已安装：npm install -g reasonix\r\n` +
        `尝试的路径：${cliPath}\x1b[0m\r\n`
      );
    }
    return;
  }

  const args = mode === "code"
    ? [cliPath, "code", cwd || os.homedir()]
    : [cliPath, "chat"];

  const nodePathDirs = isPackaged()
    ? [path.join(process.resourcesPath, "node_modules")]
    : [path.join(__dirname, "..", "..", "..", "node_modules")];

  const cliDir = path.dirname(path.dirname(path.dirname(cliPath)));
  const gm = path.dirname(cliDir);
  if (!nodePathDirs.includes(gm)) nodePathDirs.push(gm);

  const pty = spawn(nodePath, args, {
    name: "xterm-256color",
    cols: 120,
    rows: 40,
    cwd: cwd || os.homedir(),
    env: {
      ...process.env,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      NODE_PATH: nodePathDirs.join(path.delimiter),
    },
  });

  session = { pty, mode, cwd };

  if (skill && skill !== "none" && mode === "code") {
    setTimeout(() => { if (session) pty.write(`/skill ${skill}\r`); }, 2000);
  }

  pty.onData((data: string) => {
    if (!window.isDestroyed()) {
      window.webContents.send("reasonix:output", data);
    }
  });

  pty.onExit(({ exitCode, signal }) => {
    if (!window.isDestroyed()) {
      window.webContents.send("reasonix:exited", { exitCode, signal });
    }
    session = null;
  });
}

export function sendInput(data: string): void {
  if (session) session.pty.write(data);
}

export function stopSession(): void {
  if (session) {
    session.pty.kill();
    session = null;
  }
}

export function getSessionInfo(): { mode: ReasonixMode; cwd: string } | null {
  if (!session) return null;
  return { mode: session.mode, cwd: session.cwd };
}
