"use client";

import React from "react";
import { Cpu, Terminal, Activity } from "lucide-react";
import { useOikosStore } from "@/lib/store";

interface Props {
  currentTheme: "dark" | "light";
}

export function TraceStreamPane({ currentTheme }: Props) {
  const isDark = currentTheme === "dark";
  const { messages, openTraceInspector } = useOikosStore();

  // Extract all rawEvents and toolExecutions across messages for the live trace stream
  const activeEvents = messages.flatMap((msg) => {
    const events: { id: string; title: string; subtitle: string; time: string; msg: typeof msg }[] = [];
    
    if (msg.toolExecutions && msg.toolExecutions.length > 0) {
      msg.toolExecutions.forEach((t) => {
        events.push({
          id: `tool-${t.id}`,
          title: `Tool: ${t.toolName}`,
          subtitle: `Status: ${t.status}${t.durationMs ? ` (${t.durationMs}ms)` : ""}`,
          time: new Date(t.startTime).toLocaleTimeString(),
          msg,
        });
      });
    }

    if (msg.rawEvents && msg.rawEvents.length > 0) {
      msg.rawEvents.forEach((e, idx) => {
        const typeStr = String(e.type || e.event || `Event #${idx + 1}`);
        events.push({
          id: `evt-${msg.id}-${idx}`,
          title: typeStr,
          subtitle: JSON.stringify(e).slice(0, 60) + "...",
          time: new Date(msg.timestamp).toLocaleTimeString(),
          msg,
        });
      });
    }

    return events;
  });

  return (
    <aside
      className={`w-80 border-l flex flex-col shrink-0 transition-colors ${
        isDark ? "border-slate-800 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-900"
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
        <span className="text-[10px] text-emerald-500 font-semibold">
          {activeEvents.length > 0 ? `${activeEvents.length} Events` : "Listening"}
        </span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-[11px]">
        {activeEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <Activity className="h-6 w-6 text-slate-400 mb-2 animate-pulse" />
            <p className="text-xs font-sans text-slate-500">No active trace events.</p>
            <p className="text-[10px] text-slate-400 mt-1">Run an agent in the Playground to stream live telemetry.</p>
          </div>
        ) : (
          activeEvents.map((evt) => (
            <div
              key={evt.id}
              onClick={() => openTraceInspector(evt.msg)}
              className={`p-3 rounded-lg border cursor-pointer transition hover:border-cyan-500/50 ${
                isDark
                  ? "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800/80"
                  : "border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50"
              }`}
            >
              <div className="text-cyan-500 font-bold flex items-center justify-between">
                <span className="flex items-center gap-1 truncate">
                  <Terminal className="h-3 w-3 shrink-0" />
                  <span className="truncate">{evt.title}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal shrink-0">{evt.time}</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400 truncate">{evt.subtitle}</div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
