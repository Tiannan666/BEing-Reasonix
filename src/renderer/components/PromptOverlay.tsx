/**
 * PromptOverlay.tsx — Interactive prompt takeover overlay.
 *
 * When Reasonix needs user input (yes/no, choose 1/2/3, enter a path),
 * this component renders a modal overlay and writes the user's choice
 * back to the PTY via prompt:respond.
 */
import React, { useState } from "react";
import { AlertTriangle, Send, FolderOpen } from "lucide-react";
import type { PromptInfo } from "../../preload/index";

const api = window.electronAPI;

interface Props {
  prompt: PromptInfo;
  onRespond: () => void;
}

export default function PromptOverlay({ prompt, onRespond }: Props) {
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null);
  const [pathValue, setPathValue] = useState(prompt.defaultValue || "");

  const handleConfirm = (value: string) => {
    api.respondToPrompt(value);
    onRespond();
  };

  const handleChoiceSubmit = () => {
    if (choiceIndex !== null && prompt.choices) {
      const chosen = prompt.choices[choiceIndex];
      // Extract just the number from "1. option text"
      const num = chosen.match(/^(\d+)/)?.[1] || String(choiceIndex + 1);
      api.respondToPrompt(num);
      onRespond();
    }
  };

  const handlePathSubmit = () => {
    if (pathValue.trim()) {
      api.respondToPrompt(pathValue.trim());
      onRespond();
    }
  };

  const handleBrowsePath = async () => {
    const dir = await api.selectDirectory();
    if (dir) setPathValue(dir);
  };

  return (
    <div className="prompt-overlay-backdrop">
      <div className="prompt-overlay-card">
        <div className="prompt-overlay-header">
          <AlertTriangle size={20} strokeWidth={1.5} />
          <span>Reasonix 需要你的确认</span>
        </div>

        <div className="prompt-overlay-message">{prompt.message}</div>

        {/* Confirm type */}
        {prompt.type === "confirm" && (
          <div className="prompt-overlay-actions">
            <button
              className="prompt-btn prompt-btn--yes"
              onClick={() => handleConfirm("y")}
            >
              是 (y)
            </button>
            <button
              className="prompt-btn prompt-btn--no"
              onClick={() => handleConfirm("n")}
            >
              否 (No)
            </button>
          </div>
        )}

        {/* Choice type */}
        {prompt.type === "choice" && prompt.choices && (
          <div className="prompt-overlay-choices">
            {prompt.choices.map((c, i) => (
              <label
                key={i}
                className={`prompt-choice-item ${choiceIndex === i ? "prompt-choice-item--selected" : ""}`}
              >
                <input
                  type="radio"
                  name="prompt-choice"
                  checked={choiceIndex === i}
                  onChange={() => setChoiceIndex(i)}
                />
                <span>{c}</span>
              </label>
            ))}
            <button
              className="prompt-btn prompt-btn--yes"
              onClick={handleChoiceSubmit}
              disabled={choiceIndex === null}
            >
              确认选择
            </button>
          </div>
        )}

        {/* Path type */}
        {prompt.type === "path" && (
          <div className="prompt-overlay-path">
            <div className="prompt-path-input-row">
              <input
                type="text"
                className="prompt-path-input"
                value={pathValue}
                onChange={(e) => setPathValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePathSubmit();
                }}
                placeholder="输入路径..."
                autoFocus
              />
              <button
                className="prompt-path-browse"
                onClick={handleBrowsePath}
                title="浏览文件夹"
              >
                <FolderOpen size={16} />
              </button>
            </div>
            <button
              className="prompt-btn prompt-btn--yes"
              onClick={handlePathSubmit}
              disabled={!pathValue.trim()}
            >
              <Send size={14} />
              确认
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
