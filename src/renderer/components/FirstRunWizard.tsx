/**
 * FirstRunWizard.tsx — First-launch API key setup.
 *
 * Shown on first run only. User enters their DeepSeek API key,
 * it gets saved to ~/.reasonix/config.json, and the wizard
 * transitions to the directory prompt.
 */
import React, { useState } from "react";
import { Key, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

const api = window.electronAPI;

interface Props {
  onComplete: () => void;
}

export default function FirstRunWizard({ onComplete }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError("请输入 DeepSeek API Key。");
      return;
    }
    if (!trimmed.startsWith("sk-")) {
      setError("API Key 应以 'sk-' 开头。");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const saved = await api.saveApiKey(trimmed);
      if (saved) {
        setSuccess(true);
        setTimeout(() => onComplete(), 600);
      } else {
        setError("保存失败，请检查磁盘权限。");
      }
    } catch {
      setError("保存时发生未知错误。");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-card">
        <div className="wizard-icon">
          <Key size={48} strokeWidth={1.5} />
        </div>

        <h1 className="wizard-title">欢迎使用 BEing Reasonix</h1>
        <p className="wizard-subtitle">
          基于 DeepSeek 的 AI 编程助手。
          <br />
          请输入您的 API Key 以开始使用。
        </p>

        <div className="wizard-input-group">
          <label htmlFor="api-key" className="wizard-label">
            DeepSeek API Key
          </label>
          <input
            id="api-key"
            type="password"
            className={`wizard-input ${error ? "wizard-input--error" : ""} ${success ? "wizard-input--success" : ""}`}
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={saving || success}
            autoFocus
          />
          {error && (
            <div className="wizard-message wizard-message--error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="wizard-message wizard-message--success">
              <CheckCircle2 size={14} />
              <span>API Key 已保存，正在启动...</span>
            </div>
          )}
        </div>

        <button
          className="wizard-button"
          onClick={handleSave}
          disabled={saving || success}
        >
          {saving ? "保存中..." : success ? "启动中..." : "继续"}
          {!saving && !success && <ArrowRight size={16} />}
        </button>

        <p className="wizard-footer">
          前往{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.open("https://platform.deepseek.com/api_keys", "_blank");
            }}
          >
            platform.deepseek.com
          </a>{" "}
          获取 Key
        </p>
      </div>
    </div>
  );
}
