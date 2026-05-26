/**
 * TerminalPanel.tsx — Pure xterm.js terminal, directly connected to Reasonix PTY.
 * No filtering, no processing, no status bars. Just the terminal.
 */
import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

const api = window.electronAPI;

export default function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current || termRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace",
      scrollback: 5000,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();

    // PTY output → terminal
    api.onOutput((data: string) => term.write(data));

    // Keystrokes → PTY
    term.onData((data) => api.sendInput(data));

    // Ctrl+V paste
    term.attachCustomKeyEventHandler((e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        navigator.clipboard.readText().then((t) => { if (t) api.sendInput(t); }).catch(() => {});
        return false;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && term.hasSelection()) {
        navigator.clipboard.writeText(term.getSelection()).catch(() => {});
        return false;
      }
      return true;
    });

    // Resize
    const onResize = () => { try { fit.fit(); } catch { /* */ } };
    window.addEventListener("resize", onResize);

    termRef.current = term;

    return () => {
      window.removeEventListener("resize", onResize);
      term.dispose();
      termRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="terminal-panel" />;
}
