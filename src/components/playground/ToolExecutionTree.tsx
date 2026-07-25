"use client";

import React, { useState } from "react";
import { ToolCallExecution } from "@/lib/types";
import { Wrench, ChevronDown, ChevronRight, CheckCircle2, Clock, Terminal } from "lucide-react";

interface Props {
  executions: ToolCallExecution[];
}

export function ToolExecutionTree({ executions }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!executions || executions.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="my-2.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 font-sans">
      <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
        <Wrench className="h-3.5 w-3.5 text-cyan-400" />
        <span>Tool Execution Tree ({executions.length})</span>
      </div>

      <div className="mt-2 space-y-2">
        {executions.map((exec) => {
          const isExpanded = expandedId === exec.id;
          return (
            <div
              key={exec.id}
              className="overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/70 transition-all hover:border-slate-700"
            >
              <button
                onClick={() => toggleExpand(exec.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-slate-300"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span className="flex items-center gap-1.5 font-mono font-medium text-cyan-300">
                    <Terminal className="h-3 w-3 text-cyan-400" />
                    {exec.toolName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {exec.status === "running" ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 animate-pulse">
                      <Clock className="h-3 w-3" />
                      Running...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      {exec.durationMs ? `${exec.durationMs}ms` : "Done"}
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-800/80 bg-slate-950 p-3 text-[11px]">
                  {exec.arguments && (
                    <div className="mb-2">
                      <span className="text-slate-400 font-semibold">Arguments:</span>
                      <pre className="mt-1 overflow-x-auto rounded-md bg-slate-900 p-2 font-mono text-cyan-200">
                        {JSON.stringify(exec.arguments, null, 2)}
                      </pre>
                    </div>
                  )}

                  {exec.output !== undefined && (
                    <div>
                      <span className="text-slate-400 font-semibold">Output Result:</span>
                      <pre className="mt-1 max-h-48 overflow-y-auto rounded-md bg-slate-900 p-2 font-mono text-emerald-300">
                        {typeof exec.output === "string"
                          ? exec.output
                          : JSON.stringify(exec.output, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
