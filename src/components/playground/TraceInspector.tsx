"use client";

import React, { useState } from "react";
import { useOikosStore } from "@/lib/store";
import { X, Cpu, Clock, Code, Layers, FileText, Copy, Check, Filter } from "lucide-react";

export function TraceInspector() {
  const { isTraceOpen, closeTraceInspector, selectedTraceMessage } = useOikosStore();
  const [activeTab, setActiveTab] = useState<"events" | "tools" | "metrics">("events");
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");

  if (!isTraceOpen || !selectedTraceMessage) return null;

  const handleCopyJson = () => {
    const payload = JSON.stringify(selectedTraceMessage, null, 2);
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rawEvents = selectedTraceMessage.rawEvents || [];
  const filteredEvents = rawEvents.filter((evt) => {
    if (filterType === "all") return true;
    const typeStr = String((evt as Record<string, unknown>).type || (evt as Record<string, unknown>).event || "");
    return typeStr.toLowerCase().includes(filterType.toLowerCase());
  });

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-slate-100 shadow-2xl backdrop-blur-xl transition-all">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-mono">Trace Inspector</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">AgentOS Execution Telemetry & Event Payload</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyJson}
            className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition font-mono"
            title="Copy Full JSON Payload"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
            <span>{copied ? "Copied!" : "Copy JSON"}</span>
          </button>

          <button
            onClick={closeTraceInspector}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4">
        <button
          onClick={() => setActiveTab("events")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-all ${
            activeTab === "events"
              ? "border-cyan-400 text-cyan-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Code className="h-3.5 w-3.5" />
          SSE Events ({rawEvents.length})
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-all ${
            activeTab === "tools"
              ? "border-cyan-400 text-cyan-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Tool Calls ({selectedTraceMessage.toolExecutions?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("metrics")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-all ${
            activeTab === "metrics"
              ? "border-cyan-400 text-cyan-400 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Telemetry
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-5 font-sans">
        {activeTab === "events" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                Raw SSE Event Stream
              </h4>

              {/* Event Filter */}
              <div className="flex items-center gap-1 text-[11px] font-mono">
                <Filter className="h-3 w-3 text-slate-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5 outline-none"
                >
                  <option value="all">All Events</option>
                  <option value="tool">Tool Events</option>
                  <option value="stream">Stream Start/End</option>
                </select>
              </div>
            </div>

            {filteredEvents.length > 0 ? (
              filteredEvents.map((evt, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-3 font-mono text-[11px]"
                >
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">Event #{idx + 1}</span>
                    <span className="text-[10px] text-slate-400">
                      {String((evt as Record<string, unknown>).type || (evt as Record<string, unknown>).event || "chunk")}
                    </span>
                  </div>
                  <pre className="overflow-x-auto text-slate-800 dark:text-slate-300">
                    {JSON.stringify(evt, null, 2)}
                  </pre>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
                No matching SSE event stream logs recorded.
              </div>
            )}
          </div>
        )}

        {activeTab === "tools" && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
              Tool Call Parameters & Returns
            </h4>
            {selectedTraceMessage.toolExecutions && selectedTraceMessage.toolExecutions.length > 0 ? (
              selectedTraceMessage.toolExecutions.map((t) => (
                <div key={t.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-xs">{t.toolName}</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">{t.status}</span>
                  </div>
                  <div className="text-[11px] text-slate-800 dark:text-slate-300 font-mono">
                    <div className="text-slate-500 dark:text-slate-400 font-sans font-semibold">Inputs:</div>
                    <pre className="bg-white dark:bg-slate-950 p-2 rounded mt-1 overflow-x-auto text-cyan-700 dark:text-cyan-200 border border-slate-200 dark:border-slate-800">
                      {JSON.stringify(t.arguments || {}, null, 2)}
                    </pre>
                  </div>
                  <div className="text-[11px] text-slate-800 dark:text-slate-300 font-mono">
                    <div className="text-slate-500 dark:text-slate-400 font-sans font-semibold">Output:</div>
                    <pre className="bg-white dark:bg-slate-950 p-2 rounded mt-1 overflow-x-auto text-emerald-700 dark:text-emerald-200 border border-slate-200 dark:border-slate-800">
                      {JSON.stringify(t.output || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
                No tool executions during this message turn.
              </div>
            )}
          </div>
        )}

        {activeTab === "metrics" && (
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
              Performance & Latency Telemetry
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">TTFT (Time To First Token)</span>
                <p className="text-cyan-600 dark:text-cyan-400 font-bold text-sm mt-1">
                  {selectedTraceMessage.metrics?.timeToFirstTokenMs ? `${selectedTraceMessage.metrics.timeToFirstTokenMs}ms` : "N/A"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Completion Tokens</span>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mt-1">
                  {selectedTraceMessage.metrics?.completionTokens || "N/A"} tokens
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Tools Executed</span>
                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm mt-1">
                  {selectedTraceMessage.toolExecutions?.length || 0} Invocations
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Runtime Engine</span>
                <p className="text-purple-600 dark:text-purple-400 font-bold text-xs mt-1">Agno AgentOS</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase flex items-center gap-1 font-mono">
                <FileText className="h-3 w-3" /> Response Output Size
              </span>
              <p className="font-mono text-slate-800 dark:text-slate-200 mt-1 text-xs">
                {selectedTraceMessage.content.length} characters
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
