/**
 * DirectoryPrompt.tsx — Working directory selection on every launch.
 *
 * Pops up after first-run wizard (or on subsequent launches).
 * User must select a working directory. If cancelled, the app
 * enters limited mode with a warning.
 */
import React, { useState } from "react";
import { FolderOpen, ArrowRight, AlertTriangle } from "lucide-react";

const api = window.electronAPI;

interface Props {
  lastCwd: string | null;
  onSelect: (cwd: string | null) => void;
}

export default function DirectoryPrompt({ lastCwd, onSelect }: Props) {
  const [selected, setSelected] = useState<string | null>(lastCwd);
  const [picking, setPicking] = useState(false);

  const handleBrowse = async () => {
    setPicking(true);
    try {
      const dir = await api.selectDirectory();
      if (dir) setSelected(dir);
    } finally {
      setPicking(false);
    }
  };

  const handleContinue = async () => {
    if (selected) {
      await api.saveLastCwd(selected);
    }
    onSelect(selected);
  };

  const handleSkip = () => {
    onSelect(null);
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-card">
        <div className="wizard-icon">
          <FolderOpen size={48} strokeWidth={1.5} />
        </div>

        <h1 className="wizard-title">选择工作目录</h1>
        <p className="wizard-subtitle">
          Reasonix 将在此目录下执行所有操作。
          <br />
          选择你的项目文件夹以继续。
        </p>

        <div className="dir-prompt-area">
          <button
            className="dir-prompt-browse"
            onClick={handleBrowse}
            disabled={picking}
          >
            <FolderOpen size={20} strokeWidth={1.5} />
            <span>{picking ? "选择中..." : "浏览文件夹..."}</span>
          </button>

          {selected && (
            <div className="dir-prompt-selected">
              <div className="dir-prompt-path">{selected}</div>
            </div>
          )}
        </div>

        <div className="dir-prompt-actions">
          <button
            className="wizard-button"
            onClick={handleContinue}
            disabled={!selected}
          >
            开始使用
            <ArrowRight size={16} />
          </button>
          <button className="wizard-button-secondary" onClick={handleSkip}>
            暂不选择
          </button>
        </div>

        {!selected && (
          <div className="dir-prompt-warning">
            <AlertTriangle size={14} />
            <span>未选择工作目录，部分功能将受到限制。</span>
          </div>
        )}
      </div>
    </div>
  );
}
