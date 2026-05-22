/**
 * setup.ts — Configuration & first-run management.
 *
 * Reads/writes ~/.reasonix/config.json (apiKey) and manages
 * first-run flag and last-working-directory memory.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import os from "os";

const REASONIX_DIR = path.join(os.homedir(), ".reasonix");
const CONFIG_FILE = path.join(REASONIX_DIR, "config.json");
const FIRST_RUN_FLAG = path.join(REASONIX_DIR, ".launcher-first-run");
const LAST_CWD_FILE = path.join(REASONIX_DIR, ".last-cwd");

function ensureDir(): void {
  if (!existsSync(REASONIX_DIR)) {
    mkdirSync(REASONIX_DIR, { recursive: true });
  }
}

// ── API Key ──────────────────────────────────────────────────────

export function getApiKey(): string | null {
  try {
    if (!existsSync(CONFIG_FILE)) return null;
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    const config = JSON.parse(raw);
    return config.apiKey || null;
  } catch {
    return null;
  }
}

export function saveApiKey(key: string): boolean {
  try {
    ensureDir();
    let config: Record<string, unknown> = {};
    if (existsSync(CONFIG_FILE)) {
      config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    }
    config.apiKey = key;
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

// ── First Run ────────────────────────────────────────────────────

export function isFirstRun(): boolean {
  return !existsSync(FIRST_RUN_FLAG);
}

export function markFirstRunDone(): void {
  ensureDir();
  writeFileSync(FIRST_RUN_FLAG, new Date().toISOString(), "utf-8");
}

// ── Last Working Directory ───────────────────────────────────────

export function getLastCwd(): string | null {
  try {
    if (!existsSync(LAST_CWD_FILE)) return null;
    const saved = readFileSync(LAST_CWD_FILE, "utf-8").trim();
    if (saved && existsSync(saved)) return saved;
    return null;
  } catch {
    return null;
  }
}

export function saveLastCwd(cwd: string): void {
  ensureDir();
  writeFileSync(LAST_CWD_FILE, cwd, "utf-8");
}
