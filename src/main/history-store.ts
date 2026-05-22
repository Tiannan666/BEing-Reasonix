/**
 * history-store.ts — Conversation history persisted per-skill.
 *
 * Directory layout:
 *   ~/.reasonix/history/
 *     <skill>/
 *       <conversation-id>.json
 *
 * Each file is an array of { role, content, timestamp }.
 * "none" is the default skill (no skill selected).
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import path from "path";
import os from "os";

const HISTORY_ROOT = path.join(os.homedir(), ".reasonix", "history");

// ── Types ────────────────────────────────────────────────────────

export interface HistoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string; // ISO-8601
}

export interface ConversationMeta {
  id: string;
  skill: string;
  title: string;        // first user message or "New conversation"
  createdAt: string;    // ISO-8601
  updatedAt: string;    // ISO-8601
  messageCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function skillDir(skill: string): string {
  return path.join(HISTORY_ROOT, sanitize(skill));
}

function conversationPath(skill: string, id: string): string {
  return path.join(skillDir(skill), `${id}.json`);
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-.]/g, "_");
}

function ensureSkillDir(skill: string): void {
  const dir = skillDir(skill);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Public API ───────────────────────────────────────────────────

/** List all conversations for a skill, newest first. */
export function listConversations(skill: string): ConversationMeta[] {
  const dir = skillDir(skill);
  if (!existsSync(dir)) return [];

  const results: ConversationMeta[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const id = entry.name.replace(/\.json$/, "");
      const filePath = path.join(dir, entry.name);
      try {
        const raw = readFileSync(filePath, "utf-8");
        const messages: HistoryMessage[] = JSON.parse(raw);
        if (!Array.isArray(messages) || messages.length === 0) continue;
        const firstUser = messages.find((m) => m.role === "user");
        const title = firstUser
          ? firstUser.content.slice(0, 60).replace(/\n/g, " ")
          : "New conversation";
        results.push({
          id,
          skill,
          title,
          createdAt: messages[0].timestamp,
          updatedAt: messages[messages.length - 1].timestamp,
          messageCount: messages.length,
        });
      } catch {
        // skip corrupt files
      }
    }
  } catch {
    // permission error — return empty
  }

  // newest first
  results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return results;
}

/** Load all messages for a conversation. */
export function loadConversation(skill: string, id: string): HistoryMessage[] {
  const fp = conversationPath(skill, id);
  if (!existsSync(fp)) return [];
  try {
    return JSON.parse(readFileSync(fp, "utf-8"));
  } catch {
    return [];
  }
}

/** Create a new conversation and return its id. */
export function createConversation(skill: string): string {
  ensureSkillDir(skill);
  const id = generateId();
  writeFileSync(conversationPath(skill, id), "[]", "utf-8");
  return id;
}

/** Append messages to a conversation. Creates it if not exists. */
export function appendMessages(
  skill: string,
  id: string,
  messages: HistoryMessage[]
): void {
  ensureSkillDir(skill);
  const fp = conversationPath(skill, id);
  let existing: HistoryMessage[] = [];
  if (existsSync(fp)) {
    try {
      existing = JSON.parse(readFileSync(fp, "utf-8"));
    } catch {
      existing = [];
    }
  }
  existing.push(...messages);
  writeFileSync(fp, JSON.stringify(existing, null, 2), "utf-8");
}

/** Delete a conversation. */
export function deleteConversation(skill: string, id: string): boolean {
  const fp = conversationPath(skill, id);
  if (!existsSync(fp)) return false;
  try {
    unlinkSync(fp);
    return true;
  } catch {
    return false;
  }
}
