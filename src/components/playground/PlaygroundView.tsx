"use client";

import React, { useState, useRef, useEffect } from "react";
import { useOikosStore } from "@/lib/store";
import { ChatMessage, ToolCallExecution } from "@/lib/types";
import { streamAgentRun } from "@/lib/agentos";
import { ToolExecutionTree } from "./ToolExecutionTree";
import { TraceInspector } from "./TraceInspector";
import {
  Send,
  User,
  Activity,
  Cpu,
  Sparkles,
  Terminal,
  Paperclip,
  Wrench,
  X,
  File,
  Image as ImageIcon,
  Zap,
} from "lucide-react";

interface AttachedFile {
  id: string;
  name: string;
  type: string;
  size: number;
}

export function PlaygroundView() {
  const {
    activeInstance,
    agents,
    selectedAgent,
    setSelectedAgent,
    messages,
    addMessage,
    updateLastMessage,
    openTraceInspector,
  } = useOikosStore();

  const [inputMessage, setInputMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokensPerSecond, setTokensPerSecond] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: AttachedFile[] = Array.from(files).map((f) => ({
      id: `file-${Date.now()}-${Math.random()}`,
      name: f.name,
      type: f.type,
      size: f.size,
    }));

    setAttachedFiles((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputMessage.trim() && attachedFiles.length === 0) || isStreaming || !activeInstance) return;

    const userQuery = inputMessage.trim();
    const currentFiles = [...attachedFiles];
    setInputMessage("");
    setAttachedFiles([]);

    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userQuery + (currentFiles.length > 0 ? `\n\n📎 Attached files: ${currentFiles.map((f) => f.name).join(", ")}` : ""),
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);

    // 2. Prepare Assistant Message Placeholder
    const assistantMsgId = `assistant-${Date.now()}`;
    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let chunkCount = 0;

    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      toolExecutions: [],
      rawEvents: [],
      metrics: {
        timeToFirstTokenMs: 0,
        totalDurationMs: 0,
        promptTokens: Math.floor(userQuery.length / 4) + 50,
        completionTokens: 0,
      },
    };
    addMessage(assistantMsg);

    setIsStreaming(true);

    try {
      const toolExecMap = new Map<string, ToolCallExecution>();

      await streamAgentRun({
        instanceId: activeInstance.id,
        agentId: selectedAgent?.id || "agent",
        message: userQuery,
        onChunk: (chunkText) => {
          if (!firstTokenTime) {
            firstTokenTime = Date.now();
          }
          chunkCount += 1;

          const elapsedSec = (Date.now() - startTime) / 1000;
          if (elapsedSec > 0) {
            setTokensPerSecond(Number((chunkCount / elapsedSec).toFixed(1)));
          }

          updateLastMessage((prev) => ({
            ...prev,
            content: prev.content + chunkText,
            metrics: {
              ...prev.metrics,
              timeToFirstTokenMs: firstTokenTime ? firstTokenTime - startTime : 0,
              totalDurationMs: Date.now() - startTime,
              completionTokens: Math.floor((prev.content + chunkText).length / 4),
            },
          }));
        },
        onToolCall: (toolCall) => {
          toolExecMap.set(toolCall.id, toolCall);
          updateLastMessage((prev) => ({
            ...prev,
            toolExecutions: Array.from(toolExecMap.values()),
          }));
        },
        onRawEvent: (rawEvt) => {
          updateLastMessage((prev) => ({
            ...prev,
            rawEvents: [...(prev.rawEvents || []), rawEvt],
          }));
        },
      });
    } catch (err) {
      updateLastMessage((prev) => ({
        ...prev,
        content: prev.content + `\n\n⚠️ **Error connecting to AgentOS**: ${String(err)}`,
      }));
    } finally {
      setIsStreaming(false);
      setTokensPerSecond(null);
    }
  };

  return (
    <div className="relative flex h-[calc(100vh-4rem)] flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      {/* Playground Header: Agent Selector & Status */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Cpu className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Target Agent:</span>
            <select
              value={selectedAgent?.id || ""}
              onChange={(e) => {
                const a = agents.find((ag) => ag.id === e.target.value);
                if (a) setSelectedAgent(a);
              }}
              className="rounded-lg bg-slate-100 dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-cyan-600 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 font-mono"
            >
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id} className="bg-slate-900 text-slate-200">
                  {ag.name} ({ag.model || "Agno Model"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Streaming Rate & Tools Badge */}
        <div className="flex items-center gap-3 text-xs">
          {tokensPerSecond !== null && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-300 dark:border-cyan-800 animate-pulse">
              <Zap className="h-3 w-3" /> {tokensPerSecond} tokens/sec
            </span>
          )}

          {selectedAgent && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Wrench className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <div className="flex gap-1.5">
                {selectedAgent.tools?.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50"
                  >
                    {t}
                  </span>
                )) || <span className="text-slate-500 italic">No tools</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-4 shadow-xl shadow-cyan-500/5">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight font-mono">
                Agno AgentOS Playground
              </h2>
              <p className="mt-2 max-w-md text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Send prompts, attach multi-modal documents/images, stream agent runs, and inspect real-time tool execution trees and telemetry.
              </p>

              {/* Sample Quick Prompts */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {[
                  "Search the web for the latest Agno AgentOS release features",
                  "Run a Python script to calculate Fibonacci numbers up to 100",
                  "Explain how Oikos proxies SSE agent streams cleanly",
                  "List available tools and system memory for this agent",
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputMessage(prompt);
                    }}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 text-left text-xs text-slate-700 dark:text-slate-300 hover:border-cyan-500/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group"
                  >
                    <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-mono text-[10px] mb-1">
                      <Terminal className="h-3 w-3" />
                      Quick Prompt #{i + 1}
                    </div>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    <Cpu className="h-4 w-4" />
                  </div>
                )}

                <div className={`group relative max-w-2xl space-y-2 ${msg.role === "user" ? "w-auto" : "w-full"}`}>
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none"
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm"
                    }`}
                  >
                    {/* Render Tool Execution Tree if Assistant executed tools */}
                    {msg.role === "assistant" && msg.toolExecutions && (
                      <ToolExecutionTree executions={msg.toolExecutions} />
                    )}

                    {/* Main text content */}
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.content || (isStreaming ? "Thinking..." : "")}
                    </div>
                  </div>

                  {/* Message Performance Metrics & Actions */}
                  {msg.role === "assistant" && (
                    <div className="flex items-center justify-between px-1 text-[10px] font-mono text-slate-500">
                      <div className="flex items-center gap-3">
                        <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        {msg.metrics?.timeToFirstTokenMs ? (
                          <span className="text-cyan-600 dark:text-cyan-400">TTFT: {msg.metrics.timeToFirstTokenMs}ms</span>
                        ) : null}
                        {msg.metrics?.completionTokens ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Tokens: {msg.metrics.completionTokens}</span>
                        ) : null}
                      </div>

                      <button
                        onClick={() => openTraceInspector(msg)}
                        className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition"
                      >
                        <Cpu className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                        Inspect Trace
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Footer Chat Input Box & Multi-modal Attachment Bar */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 sm:p-6 space-y-2">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileAttach}
          className="hidden"
          accept="image/*,.pdf,.txt,.md,.py,.json"
        />

        {/* Attached Files Preview Bar */}
        {attachedFiles.length > 0 && (
          <div className="mx-auto max-w-4xl flex items-center gap-2 overflow-x-auto pb-2">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs text-slate-700 dark:text-slate-300 shrink-0 font-mono"
              >
                {file.type.startsWith("image/") ? (
                  <ImageIcon className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                ) : (
                  <File className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                )}
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(file.id)}
                  className="text-slate-400 hover:text-rose-500 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
          <div className="relative flex items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/90 shadow-xl focus-within:border-cyan-500/50 transition">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="pl-4 pr-2 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
              title="Attach Multi-modal Document or Image"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Message ${selectedAgent?.name || "AgentOS"}...`}
              disabled={isStreaming}
              className="w-full bg-transparent px-2 py-3.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none font-sans"
            />

            <button
              type="submit"
              disabled={(!inputMessage.trim() && attachedFiles.length === 0) || isStreaming}
              className="mr-2 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
            >
              {isStreaming ? (
                <Activity className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between px-2 text-[10px] text-slate-500 font-mono">
            <span>
              Connected to: <strong className="text-slate-700 dark:text-slate-400">{activeInstance?.name || "Local"}</strong> ({activeInstance?.baseUrl})
            </span>
            <span>Press Enter to send</span>
          </div>
        </form>
      </div>

      {/* Slide-Over Trace Inspector Panel */}
      <TraceInspector />
    </div>
  );
}
