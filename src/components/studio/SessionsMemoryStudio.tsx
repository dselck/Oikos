"use client";

import React, { useState, useEffect } from "react";
import { useAgentOSRegistry } from "@/hooks/useAgentOSRegistry";
import { sessionMemoryEngine } from "@/lib/session-engine";
import { Session, SessionDetails } from "@/lib/types";
import {
  History,
  Trash2,
  Cpu,
  User,
  Database,
  Brain,
  MessageSquare,
  Search,
  Loader2,
} from "lucide-react";

export function SessionsMemoryStudio() {
  const { sessions, deleteEntity } = useAgentOSRegistry();

  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const activeSelectedSession = selectedSession || (sessions.length > 0 ? sessions[0] : null);

  useEffect(() => {
    if (!activeSelectedSession?.id) {
      setSessionDetails(null);
      return;
    }

    let isMounted = true;
    setIsLoadingDetails(true);
    setDetailsError(null);

    sessionMemoryEngine
      .getSessionDetails(activeSelectedSession.id)
      .then((details) => {
        if (isMounted) {
          setSessionDetails(details);
          setIsLoadingDetails(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setDetailsError(err instanceof Error ? err.message : String(err));
          setIsLoadingDetails(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeSelectedSession?.id]);


  const handleDeleteSession = async (id: string) => {
    if (!confirm("Are you sure you want to delete this session and clear its memory history?")) return;
    const ok = await deleteEntity("sessions", id);
    if (ok && activeSelectedSession?.id === id) {
      setSelectedSession(null);
      setSessionDetails(null);
    }
  };

  const filteredSessions = sessions.filter(
    (s) =>
      (s.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.agentId || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Studio Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-md">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono tracking-tight">Sessions & Memory Hub</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect historical conversation sessions, memory contexts, user state, and evaluation metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <Database className="h-4 w-4 text-cyan-500" />
          <span>Agno SqliteDb / PostgresDb</span>
        </div>
      </div>

      {/* Main 2-Column Split: Sessions List on Left, Detail Memory Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sessions List */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search sessions by title or agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-1.5 text-xs outline-none focus:border-cyan-500 font-sans"
            />
          </div>

          <div className="space-y-2">
            {filteredSessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
                No active sessions found in database.
              </div>
            ) : (
              filteredSessions.map((sess) => {
                const isSelected = activeSelectedSession?.id === sess.id;
                return (
                  <div
                    key={sess.id}
                    onClick={() => setSelectedSession(sess)}
                    className={`rounded-xl border p-4 cursor-pointer transition ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-cyan-500" />
                          {sess.title}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          Agent: <span className="text-indigo-500 font-semibold">{sess.agentId}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(sess.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-800/80 pt-2 font-mono">
                      <span>ID: {sess.id}</span>
                      <span>{new Date(sess.updatedAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Session Detail & User Memory Inspector */}
        <div className="col-span-1 lg:col-span-2">
          {activeSelectedSession ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-indigo-500" />
                    {sessionDetails?.title || activeSelectedSession.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    Session ID: {activeSelectedSession.id} • Agent: {sessionDetails?.agentId || activeSelectedSession.agentId}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteSession(activeSelectedSession.id)}
                  className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear Session
                </button>
              </div>

              {/* Session Telemetry Badges */}
              {sessionDetails?.telemetry && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-center">
                    <div className="text-[10px] uppercase font-mono text-slate-500">Total Messages</div>
                    <div className="text-sm font-bold font-mono text-indigo-500">{sessionDetails.telemetry.totalMessages}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-center">
                    <div className="text-[10px] uppercase font-mono text-slate-500">Tool Calls</div>
                    <div className="text-sm font-bold font-mono text-cyan-500">{sessionDetails.telemetry.totalToolCalls}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-center">
                    <div className="text-[10px] uppercase font-mono text-slate-500">Prompt Tokens</div>
                    <div className="text-sm font-bold font-mono text-emerald-500">{sessionDetails.telemetry.estimatedPromptTokens}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-center">
                    <div className="text-[10px] uppercase font-mono text-slate-500">Completion Tokens</div>
                    <div className="text-sm font-bold font-mono text-amber-500">{sessionDetails.telemetry.estimatedCompletionTokens}</div>
                  </div>
                </div>
              )}

              {isLoadingDetails ? (
                <div className="flex items-center justify-center p-12 text-slate-400 gap-2 text-xs font-mono">
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
                  Loading session transcript and memory context...
                </div>
              ) : detailsError ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-400 font-mono">
                  Error loading session details: {detailsError}
                </div>
              ) : (
                <>
                  {/* Memory Context Summary */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Brain className="h-3.5 w-3.5 text-cyan-500" /> User Context & Session Memory
                    </h4>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 font-mono text-xs space-y-2">
                      <div className="text-cyan-500 font-bold">Agno Session Summary Context:</div>
                      <p className="text-slate-300 font-sans text-xs leading-relaxed">
                        {sessionDetails?.memorySummary ||
                          "No stored memory summary context available for this session."}
                      </p>
                    </div>
                  </div>

                  {/* Multi-turn Message History Stream */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-indigo-500" /> Conversation Transcript History
                    </h4>

                    <div className="space-y-3">
                      {sessionDetails?.messages && sessionDetails.messages.length > 0 ? (
                        sessionDetails.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-xs space-y-1 ${
                              msg.role === "user"
                                ? "bg-slate-50 dark:bg-slate-950"
                                : "bg-slate-900 dark:bg-slate-950 border-l-4 border-l-cyan-500"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                              <span
                                className={`font-bold flex items-center gap-1 ${
                                  msg.role === "user" ? "text-indigo-500" : "text-cyan-400"
                                }`}
                              >
                                {msg.role === "user" ? (
                                  <>
                                    <User className="h-3 w-3" /> User Prompt
                                  </>
                                ) : (
                                  <>
                                    <Cpu className="h-3 w-3" /> Agent ({sessionDetails.agentId || "Agno"})
                                  </>
                                )}
                              </span>
                              <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-slate-300 font-sans leading-relaxed">{msg.content}</p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
                          No conversation transcript messages recorded for this session.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-xs text-slate-500">
              Select a session on the left to inspect its conversation transcript, user memory context, and telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

