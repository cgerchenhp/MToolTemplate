import { useEffect, useRef, useState } from "react";
import type { LogLine } from "../../hooks/useBackendLog";

// ── Level → line colour ──────────────────────────────────────────────────

const LEVEL_LINE_CLS: Record<string, string> = {
  DEBUG:    "text-gray-500",
  INFO:     "text-gray-300",
  WARNING:  "text-yellow-400",
  ERROR:    "text-red-400",
  CRITICAL: "text-red-600 font-bold",
  SYSTEM:   "text-blue-400 italic",
};

function getLineCls(line: LogLine): string {
  return (
    LEVEL_LINE_CLS[line.level] ??
    (line.stream === "stderr" ? "text-red-400" : "text-gray-300")
  );
}

// ── Filter ───────────────────────────────────────────────────────────────

// Numeric rank: SYSTEM(-1) always shown; DEBUG=0, INFO=1, WARNING=2, ERROR=3, CRITICAL=4
const LEVEL_RANK: Record<string, number> = {
  SYSTEM: -1, DEBUG: 0, INFO: 1, WARNING: 2, ERROR: 3, CRITICAL: 4,
};

type MinLevel = "ALL" | "INFO" | "WARN" | "ERROR";

const FILTER_RANK: Record<MinLevel, number> = {
  ALL: -999, INFO: 1, WARN: 2, ERROR: 3,
};

const FILTER_ACTIVE_CLS: Record<MinLevel, string> = {
  ALL:   "bg-gray-600 text-gray-100",
  INFO:  "bg-blue-700 text-blue-100",
  WARN:  "bg-yellow-700 text-yellow-100",
  ERROR: "bg-red-700   text-red-100",
};

const FILTER_LABELS: MinLevel[] = ["ALL", "INFO", "WARN", "ERROR"];

// ── Component ─────────────────────────────────────────────────────────────

interface BackendLogTabProps {
  lines: LogLine[];
}

export function BackendLogTab({ lines }: BackendLogTabProps) {
  const [minLevel, setMinLevel] = useState<MinLevel>("ALL");
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = lines.filter((line) => {
    const rank = LEVEL_RANK[line.level] ?? 1;
    return rank === -1 || rank >= FILTER_RANK[minLevel];
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [filtered]);

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-800 shrink-0">
        <span className="text-[10px] text-gray-600 mr-1 select-none">Filter:</span>
        {FILTER_LABELS.map((lvl) => (
          <button
            key={lvl}
            onClick={() => setMinLevel(lvl)}
            className={`text-[10px] px-1.5 py-0.5 rounded select-none transition-colors ${
              minLevel === lvl
                ? FILTER_ACTIVE_CLS[lvl]
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
            }`}
          >
            {lvl}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-gray-600 select-none tabular-nums">
          {filtered.length} / {lines.length}
        </span>
      </div>

      {/* ── Log lines ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1.5 font-mono text-[11px] select-text">
        {filtered.length === 0 ? (
          <p className="text-gray-600 italic">暂无日志…</p>
        ) : (
          filtered.map((line) => (
            <div
              key={line.id}
              className={`break-all whitespace-pre-wrap leading-[1.55] ${getLineCls(line)}`}
            >
              {line.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
