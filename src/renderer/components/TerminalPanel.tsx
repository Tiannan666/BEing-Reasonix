/**
 * TerminalPanel.tsx — xterm.js terminal embedded in the main panel.
 *
 * PTY output goes directly to xterm; user keystrokes go directly to PTY.
 * No parsing, no filtering — Reasonix handles everything.
 */
import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

const api = window.electronAPI;

export default function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current || termRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 14,
      fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      allowProposedApi: true,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    termRef.current = term;
    fitRef.current = fit;

    // Forward keystrokes to PTY
    term.onData((data) => {
      api.sendInput(data);
    });

    // Enable Ctrl+V / Ctrl+Shift+V paste
    term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        navigator.clipboard.readText().then((text) => {
          if (text) api.sendInput(text);
        }).catch(() => {});
        return false; // prevent default
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection()).catch(() => {});
        return false;
      }
      return true;
    });

    // PTY output → terminal display
    const unsub = api.onOutput((data: string) => {
      term.write(data);
    });

    // Resize handler
    const onResize = () => {
      try { fit.fit(); } catch { /* ignore */ }
    };
    window.addEventListener("resize", onResize);

    // Focus terminal on mount
    setTimeout(() => term.focus(), 200);

    return () => {
      unsub();
      window.removeEventListener("resize", onResize);
      term.dispose();
      termRef.current = null;
    };
  }, []);

  return (
    <div
      className="terminal-panel"
      ref={containerRef}
      onClick={() => termRef.current?.focus()}
    />
  );
}
