"use client";

import React, { useState, useEffect } from "react";
import { useOikosStore } from "@/lib/store";
import { Agent } from "@/lib/types";
import { AgentCardGrid, AgnoAgentRecord } from "./AgentCardGrid";
import { TeamBuilderForm } from "./TeamBuilderForm";
import {
  Plus,
  Trash2,
  Edit3,
  Wrench,
  Cpu,
  CheckCircle2,
  Users,
  Play,
  Layers,
  Sparkles,
  Search,
} from "lucide-react";

interface AgnoTeamRecord {
  id: string;
  name: string;
  description: string | null;
  leaderAgentId: string;
  memberAgentIdsJson: string;
  executionMode: string;
  instructionsJson: string | null;
  sharedMemory: boolean;
  createdAt: string;
  updatedAt: string;
}

export function AgentTeamStudio() {
  const { setViewMode, setSelectedAgent } = useOikosStore();

  const [activeSubTab, setActiveSubTab] = useState<"agents" | "teams">("agents");
  const [agentsList, setAgentsList] = useState<AgnoAgentRecord[]>([]);
  const [teamsList, setTeamsList] = useState<AgnoTeamRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Agent Form State
  const [isEditingAgent, setIsEditingAgent] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [modelProvider, setModelProvider] = useState("openai");
  const [modelName, setModelName] = useState("gpt-4o");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [instructionsText, setInstructionsText] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>(["duckduckgo_search"]);

  // Team Form State
  const [isEditingTeam, setIsEditingTeam] = useState(false);

  useEffect(() => {
    loadRegistry();
  }, []);

  const loadRegistry = async () => {
    try {
      const [agentsRes, teamsRes] = await Promise.all([
        fetch("/api/registry/agents"),
        fetch("/api/registry/teams"),
      ]);
      if (agentsRes.ok) {
        setAgentsList(await agentsRes.json());
      }
      if (teamsRes.ok) {
        setTeamsList(await teamsRes.json());
      }
    } catch (e) {
      console.error("Failed to load registry", e);
    }
  };

  const handleOpenNewAgent = () => {
    setEditingAgentId(null);
    setAgentName("");
    setAgentDescription("");
    setModelProvider("openai");
    setModelName("gpt-4o");
    setSystemPrompt("You are an autonomous AI agent powered by Agno AgentOS.");
    setInstructionsText("Be accurate, concise, and helpful.");
    setSelectedTools(["duckduckgo_search"]);
    setIsEditingAgent(true);
  };

  const handleOpenEditAgent = (ag: AgnoAgentRecord) => {
    setEditingAgentId(ag.id);
    setAgentName(ag.name);
    setAgentDescription(ag.description || "");
    setModelProvider(ag.modelProvider || "openai");
    setModelName(ag.modelName || "gpt-4o");
    setSystemPrompt(ag.systemPrompt || "");
    try {
      const instArr = JSON.parse(ag.instructionsJson || "[]");
      setInstructionsText(Array.isArray(instArr) ? instArr.join("\n") : "");
    } catch {
      setInstructionsText(ag.instructionsJson || "");
    }
    try {
      const toolsArr = JSON.parse(ag.toolsJson || "[]");
      setSelectedTools(Array.isArray(toolsArr) ? toolsArr : []);
    } catch {
      setSelectedTools([]);
    }
    setIsEditingAgent(true);
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) return;

    const instructions = instructionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      id: editingAgentId || `agent-${Date.now()}`,
      name: agentName,
      description: agentDescription,
      modelProvider,
      modelName,
      systemPrompt,
      instructions,
      tools: selectedTools,
    };

    const method = editingAgentId ? "PUT" : "POST";
    const res = await fetch("/api/registry/agents", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setIsEditingAgent(false);
      await loadRegistry();
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("Are you sure you want to remove this agent from the DB registry?")) return;
    const res = await fetch(`/api/registry/agents?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadRegistry();
    }
  };

  const handleTestInPlayground = (ag: AgnoAgentRecord) => {
    const formatted: Agent = {
      id: ag.id,
      name: ag.name,
      description: ag.description || "",
      model: `${ag.modelProvider}:${ag.modelName}`,
      tools: JSON.parse(ag.toolsJson || "[]"),
    };
    setSelectedAgent(formatted);
    setViewMode("playground");
  };

  const handleSaveTeam = async (teamData: {
    name: string;
    description: string;
    leaderAgentId: string;
    memberAgentIds: string[];
    executionMode: string;
  }) => {
    const res = await fetch("/api/registry/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(teamData),
    });

    if (res.ok) {
      setIsEditingTeam(false);
      await loadRegistry();
    }
  };

  const availableToolsList = [
    { id: "duckduckgo_search", name: "DuckDuckGo Web Search", category: "Web Search" },
    { id: "python_interpreter", name: "Python Code Interpreter", category: "Computation" },
    { id: "arxiv_reader", name: "ArXiv Research Reader", category: "Research" },
    { id: "sql_runner", name: "SQL Query Runner", category: "Data" },
    { id: "yfinance", name: "Yahoo Finance Market Data", category: "Finance" },
  ];

  const filteredAgents = agentsList.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Studio Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono tracking-tight">Agent & Team Studio</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Author, edit, and configure DB-driven Agno Agents and multi-agent Teams (`agent.save()`).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNewAgent}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
          >
            <Plus className="h-4 w-4" />
            Create Agent
          </button>
          <button
            onClick={() => setIsEditingTeam(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Users className="h-4 w-4" />
            Create Team
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 p-1">
          <button
            onClick={() => setActiveSubTab("agents")}
            className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-medium transition ${
              activeSubTab === "agents"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            Agno Agents ({agentsList.length})
          </button>
          <button
            onClick={() => setActiveSubTab("teams")}
            className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-medium transition ${
              activeSubTab === "teams"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Agent Teams ({teamsList.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search agents & teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-1.5 text-xs outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* AGENT EDITOR MODAL */}
      {isEditingAgent && (
        <form
          onSubmit={handleSaveAgent}
          className="rounded-2xl border border-indigo-500/40 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm font-mono flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-500" />
              {editingAgentId ? "Edit Agent Definition" : "Create New Agno Agent"}
            </h3>
            <span className="text-[11px] font-mono text-emerald-500">Persists to SQLite/Postgres DB (`agent.save()`)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Agent Name</label>
              <input
                type="text"
                placeholder="e.g. Code Analyst Agent"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <input
                type="text"
                placeholder="Brief purpose of this agent"
                value={agentDescription}
                onChange={(e) => setAgentDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Model Provider</label>
              <select
                value={modelProvider}
                onChange={(e) => setModelProvider(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none font-mono"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama (Local)</option>
                <option value="groq">Groq</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Model Name</label>
              <input
                type="text"
                placeholder="e.g. gpt-4o or claude-3-5-sonnet"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">System Prompt Override</label>
              <textarea
                rows={2}
                placeholder="Low-level system instructions for the LLM..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Agent Instructions (One per line)</label>
              <textarea
                rows={3}
                placeholder="Always cite sources&#10;Keep answers concise"
                value={instructionsText}
                onChange={(e) => setInstructionsText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Tools Selection */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">Attached Agno Tools</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableToolsList.map((tool) => {
                  const isChecked = selectedTools.includes(tool.id);
                  return (
                    <label
                      key={tool.id}
                      className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition ${
                        isChecked
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 font-semibold"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTools([...selectedTools, tool.id]);
                          } else {
                            setSelectedTools(selectedTools.filter((t) => t !== tool.id));
                          }
                        }}
                        className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="min-w-0">
                        <div className="text-xs truncate">{tool.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{tool.category}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditingAgent(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Save Agent to Database
            </button>
          </div>
        </form>
      )}

      {/* TEAM EDITOR MODAL */}
      {isEditingTeam && (
        <TeamBuilderForm
          agentsList={agentsList}
          onSaveTeam={handleSaveTeam}
          onCancel={() => setIsEditingTeam(false)}
        />
      )}

      {/* SUB-TAB 1: AGENTS GRID */}
      {activeSubTab === "agents" && (
        <AgentCardGrid
          agentsList={filteredAgents}
          onEditAgent={handleOpenEditAgent}
          onDeleteAgent={handleDeleteAgent}
          onTestInPlayground={handleTestInPlayground}
        />
      )}

      {/* SUB-TAB 2: TEAMS GRID */}
      {activeSubTab === "teams" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamsList.map((tm) => {
            const members: string[] = JSON.parse(tm.memberAgentIdsJson || "[]");
            return (
              <div
                key={tm.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">{tm.name}</h3>
                    <span className="rounded bg-purple-50 dark:bg-purple-950 px-2 py-0.5 text-[10px] font-mono font-semibold text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 capitalize">
                      {tm.executionMode}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500">{tm.description || "No description provided."}</p>

                <div className="text-xs text-slate-400 font-mono space-y-1">
                  <div>Leader: <span className="text-indigo-500 font-bold">{tm.leaderAgentId}</span></div>
                  <div>Members: <span className="text-slate-200">{members.join(", ")}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
