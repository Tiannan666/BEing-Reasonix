/**
 * Sidebar.tsx — Left sidebar with skill selection, history, and new-conversation button.
 *
 * Sections:
 *  - Brand / logo
 *  - Mode switcher (Code / Chat)
 *  - Project folder display
 *  - Skill selector dropdown
 *  - History list (per-skill, most recent first)
 *  - "+ New Conversation" button
 *  - Warning when no working directory
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  FolderOpen,
  ChevronDown,
  AlertTriangle,
  Key,
  Check,
  X,
} from "lucide-react";

const api = window.electronAPI;

interface Props {
  cwd: string;
  onDirectoryChange: () => void;
}

function projectName(cwd: string): string {
  if (!cwd) return "未选择目录";
  const segs = cwd.replace(/\\/g, "/").split("/").filter(Boolean);
  return segs[segs.length - 1] || cwd;
}

export default function Sidebar({ cwd, onDirectoryChange }: Props) {

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <img src="./being-mind.png" alt="BEing Mind" style={{ width: 28, height: 28 }} />
        </div>
        <span className="sidebar-title">BEing Reasonix</span>
      </div>

      {/* Model Switcher */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">模型切换</div>
        <div className="sidebar-model-switcher">
          {(["auto", "flash", "pro"] as const).map((m) => (
            <button
              key={m}
              className="sidebar-model-btn"
              onClick={() => api.sendInput(`/preset ${m}\r`)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <ApiKeySection />

      {/* Project Folder */}
      <div className="sidebar-section">
        <div className="sidebar-section-label">项目目录</div>
        <button
          className="sidebar-project-card"
          onClick={onDirectoryChange}
          title="更换工作目录"
        >
          <div className="sidebar-project-icon">
            <FolderOpen size={20} strokeWidth={1.5} />
          </div>
          <div className="sidebar-project-info">
            <div className="sidebar-project-name">{projectName(cwd)}</div>
            <div className="sidebar-project-path">
              {cwd || "点击选择文件夹..."}
            </div>
          </div>
          <ChevronDown size={14} className="sidebar-project-chevron" />
        </button>
      </div>

      {/* Warning when no directory */}
      {!cwd && (
        <div className="sidebar-warning">
          <AlertTriangle size={14} />
          <span>未选择工作目录</span>
        </div>
      )}

      {/* Spacer to push content up */}
      <div className="sidebar-spacer" />
    </aside>
  );
}

/** Inline API key editor — expand/collapse with input + confirm */
function ApiKeySection() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || !trimmed.startsWith("sk-")) return;
    await api.saveApiKey(trimmed);
    setDone(true);
    setTimeout(() => { setOpen(false); setDone(false); setValue(""); }, 1000);
  };

  if (!open) {
    return (
      <div className="sidebar-section">
        <button className="sidebar-apikey-toggle" onClick={() => setOpen(true)}>
          <Key size={14} />
          <span>切换 API Key</span>
        </button>
      </div>
    );
  }

  return (
    <div className="sidebar-section">
      <div className="sidebar-section-label">API Key</div>
      <div className="sidebar-apikey-edit">
        <input
          className="sidebar-apikey-input"
          type="password"
          placeholder="sk-..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          autoFocus
        />
        <div className="sidebar-apikey-actions">
          <button className="sidebar-apikey-confirm" onClick={handleSave} disabled={done}>
            {done ? "✓" : <Check size={14} />}
          </button>
          <button className="sidebar-apikey-cancel" onClick={() => setOpen(false)}>
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
