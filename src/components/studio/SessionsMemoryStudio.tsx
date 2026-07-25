"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  Trash2,
  Cpu,
  User,
  Clock,
  Database,
  Brain,
  MessageSquare,
  Search,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface SavedSessionRecord {
  id: string;
  instanceId: string;
  agentId: string;
  title: string;
  metadataJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export function SessionsMemoryStudio() {
  const [sessions, setSessions] = useState<SavedSessionRecord[]>([]);
  const [selectedSession, setSelectedSession] = useState<SavedSessionRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch("/api/registry/sessions");
      if (res.ok) {
        const data: SavedSessionRecord[] = await res.json();
        setSessions(data);
        if (data.length > 0 && !selectedSession) {
          setSelectedSession(data[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load sessions", e);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Are you sure you want to delete this session and clear its memory history?")) return;
    const res = await fetch(`/api/registry/sessions?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadSessions();
      if (selectedSession?.id === id) {
        setSelectedSession(null);
      }
    }
  };

  const filteredSessions = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.agentId.toLowerCase().includes(searchQuery.toLowerCase())
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
                const isSelected = selectedSession?.id === sess.id;
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
                      <span>{new Date(sess.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Session Detail & User Memory Inspector */}
        <div className="lg:col-span-2 space-y-6">
          {selectedSession ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-sm font-mono flex items-center gap-2">
                    <Brain className="h-4 w-4 text-cyan-500" />
                    {selectedSession.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    Session ID: {selectedSession.id} • Agent: {selectedSession.agentId}
                  </p>
                </div>

                <span className="flex items-center gap-1 text-xs text-emerald-500 font-semibold font-mono">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Persisted
                </span>
              </div>

              {/* Memory Context Summary */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-cyan-500" /> User Context & Session Memory
                </h4>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 font-mono text-xs space-y-2">
                  <div className="text-cyan-500 font-bold">Agno Session Summary Context:</div>
                  <p className="text-slate-300 font-sans text-xs leading-relaxed">
                    User inquired about Agno AgentOS Docker deployment, database hydration, and workflow step execution. Memory retains preferred models (`gpt-4o`, `claude-3-5-sonnet`) and active database settings.
                  </p>
                </div>
              </div>

              {/* Sample Multi-turn Message History Stream */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-500" /> Conversation Transcript History
                </h4>

                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="font-bold text-indigo-500 flex items-center gap-1">
                        <User className="h-3 w-3" /> User Prompt
                      </span>
                      <span>12:30 PM</span>
                    </div>
                    <p className="text-slate-300 font-sans">How do I deploy Agno AgentOS with SQLite WAL mode enabled?</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 p-3 text-xs space-y-2 border-l-4 border-l-cyan-500">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="font-bold text-cyan-400 flex items-center gap-1">
                        <Cpu className="h-3 w-3" /> Agno Agent ({selectedSession.agentId})
                      </span>
                      <span>12:30 PM • 350ms</span>
                    </div>
                    <p className="text-slate-300 font-sans">
                      Agno AgentOS initializes SQLite WAL mode via `sqlite.pragma("journal_mode = WAL")`. You can pass `db=SqliteDb(...)` to your Agent to persist history automatically.
                    </p>
                  </div>
                </div>
              </div>
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
