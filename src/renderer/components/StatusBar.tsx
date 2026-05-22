/**
 * StatusBar.tsx — Bottom status bar showing three Reasonix metrics.
 *
 * Displays:
 *  - Balance (DeepSeek API余额) with auto-refresh
 *  - Cache (缓存命中率) — clickable to clear cache
 *  - Context (上下文使用量)
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Trash2 } from "lucide-react";

const api = window.electronAPI;

interface Props {
  stats?: { cache?: string; context?: string };
}

export default function StatusBar({ stats }: Props) {
  const [balance, setBalance] = useState<{
    total: number;
    used: number;
    currency: string;
  } | null>(null);
  const [clearing, setClearing] = useState(false);
  const [cacheMsg, setCacheMsg] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch balance on mount and every 30 seconds
  useEffect(() => {
    const fetchBal = async () => {
      const data = await api.fetchBalance();
      if (data) setBalance(data);
    };
    fetchBal();
    intervalRef.current = setInterval(fetchBal, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleClearCache = useCallback(async () => {
    // Cache clearing not available in terminal mode
  }, []);

  const cacheVal = stats?.cache || "—";
  const ctxVal = stats?.context || "—";

  return (
    <footer className="status-bar">
      <div className="status-bar-metrics">
        {/* Balance */}
        <div className="status-metric">
          <span className="status-metric-label">余额</span>
          <span className="status-metric-value">
            {balance
              ? `¥${balance.total.toFixed(2)}`
              : "—"}
          </span>
          {balance && (
            <span className="status-metric-sub">
              已用 ¥{balance.used.toFixed(2)}
            </span>
          )}
        </div>

        <span className="status-bar-sep">│</span>

        {/* Cache — clickable */}
        <button
          className="status-metric status-metric--clickable"
          onClick={handleClearCache}
          disabled={clearing}
          title="点击清理缓存"
        >
          <span className="status-metric-label">缓存</span>
          <span className="status-metric-value">
            {clearing ? "清理中..." : cacheMsg || cacheVal}
          </span>
          <Trash2 size={12} className="status-metric-icon" />
        </button>

        <span className="status-bar-sep">│</span>

        {/* Context */}
        <div className="status-metric">
          <span className="status-metric-label">上下文</span>
          <span className="status-metric-value">{ctxVal}</span>
        </div>
      </div>
    </footer>
  );
}
