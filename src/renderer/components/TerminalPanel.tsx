/**
 * TerminalPanel.tsx — xterm.js terminal directly connected to Reasonix PTY.
 * No customization, no additions. Pure terminal.
 */
import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

const api = window.electronAPI;

export default function TerminalPanel() {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elRef.current) return;

    const term = new Terminal({ cursorBlink: true });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(elRef.current);
    fit.fit();

    const unsub1 = api.onOutput((d: string) => term.write(d));
    const unsub2 = api.onExited(() => term.write("\r\n--- session ended ---\r\n"));
    term.onData((d) => api.sendInput(d));

    // minimal paste
    term.attachCustomKeyEventHandler((e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        navigator.clipboard.readText().then((t) => { if (t) api.sendInput(t); }).catch(() => {});
        return false;
      }
      return true;
    });

    const resize = () => { try { fit.fit(); } catch {} };
    window.addEventListener("resize", resize);

    return () => {
      unsub1(); unsub2();
      window.removeEventListener("resize", resize);
      term.dispose();
    };
  }, []);

  return <div ref={elRef} className="terminal-panel" />;
}
