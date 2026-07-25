"use client";

import React from "react";
import { Cpu, Terminal } from "lucide-react";

interface Props {
  currentTheme: "dark" | "light";
}

export function TraceStreamPane({ currentTheme }: Props) {
  const isDark = currentTheme === "dark";

  return (
    <aside
      className={`w-80 border-l flex flex-col shrink-0 transition-colors ${
        isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div
        className={`h-10 border-b flex items-center justify-between px-4 font-mono text-xs ${
          isDark ? "border-slate-800 bg-slate-900/80 text-cyan-400" : "border-slate-200 bg-white text-indigo-600"
        }`}
      >
        <span className="font-bold flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5" /> Live Trace Stream
        </span>
        <span className="text-[10px] text-emerald-500 font-semibold">SSE Active</span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-[11px]">
        <div
          className={`p-3 rounded-lg border ${
            isDark ? "border-slate-800 bg-slate-900 text-slate-200" : "border-slate-200 bg-white text-slate-800 shadow-sm"
          }`}
        >
          <div className="text-cyan-500 font-bold flex items-center justify-between">
            <span>Event #1</span>
            <span className="text-[10px] text-slate-400 font-normal">Ready</span>
          </div>
          <div className="mt-1 text-slate-400 font-sans text-xs">
            Connected to Agno AgentOS SQLite WAL Database Registry.
          </div>
        </div>

        <div
          className={`p-3 rounded-lg border ${
            isDark ? "border-slate-800 bg-slate-900 text-slate-200" : "border-slate-200 bg-white text-slate-800 shadow-sm"
          }`}
        >
          <div className="text-indigo-500 font-bold flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Terminal className="h-3 w-3" /> Agent Hydration
            </span>
            <span className="text-[10px] text-slate-400">db.get_agent_by_id</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            Native Agno `agent.save()` and `get_agent_by_id(id, db)` pattern enabled.
          </div>
        </div>
      </div>
    </aside>
  );
}
