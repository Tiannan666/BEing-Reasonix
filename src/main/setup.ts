import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import os from "os";

const REASONIX_DIR = path.join(os.homedir(), ".reasonix");
const CONFIG_FILE = path.join(REASONIX_DIR, "config.json");

function ensureDir(): void {
  if (!existsSync(REASONIX_DIR)) mkdirSync(REASONIX_DIR, { recursive: true });
}

export function getApiKey(): string | null {
  try {
    if (!existsSync(CONFIG_FILE)) return null;
    const config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    return config.apiKey || null;
  } catch { return null; }
}

export function saveApiKey(key: string): boolean {
  try {
    ensureDir();
    const config = existsSync(CONFIG_FILE)
      ? JSON.parse(readFileSync(CONFIG_FILE, "utf-8"))
      : {};
    config.apiKey = key;
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
    return true;
  } catch { return false; }
}
