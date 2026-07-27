"use client";

import React from "react";
import { Agent } from "@/lib/types";
import { Cpu, Edit3, Trash2, Wrench, CheckCircle2, Play } from "lucide-react";

interface Props {
  agentsList: Agent[];
  onEditAgent: (ag: Agent) => void;
  onDeleteAgent: (id: string) => void;
  onTestInPlayground: (ag: Agent) => void;
}

export function AgentCardGrid({
  agentsList,
  onEditAgent,
  onDeleteAgent,
  onTestInPlayground,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agentsList.map((ag) => {
        const tools = ag.tools || [];

        return (
          <div
            key={ag.id}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm">{ag.name}</h3>
                  <span className="rounded bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {ag.modelProvider || "openai"}:{ag.modelName || ag.model || "gpt-4o"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {ag.description || "No description provided."}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onEditAgent(ag)}
                  title="Edit Agent"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDeleteAgent(ag.id)}
                  title="Delete Agent"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Tools Badge */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <Wrench className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {tools.length > 0 ? (
                tools.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 italic text-[11px]">No tools attached</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs">
              <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                <CheckCircle2 className="h-3 w-3" /> DB Persisted
              </span>
              <button
                onClick={() => onTestInPlayground(ag)}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Play className="h-3 w-3" /> Test in Playground
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
