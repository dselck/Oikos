"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Trash2,
  Play,
  ArrowRight,
  Cpu,
  Wrench,
  CheckCircle2,
  Clock,
  Sliders,
  Code,
  Search,
} from "lucide-react";

interface WorkflowStep {
  id: string;
  type: "agent" | "tool";
  name: string;
  targetId: string; // agent_id or tool_id
  promptTemplate?: string;
}

interface AgnoWorkflowRecord {
  id: string;
  name: string;
  description: string | null;
  stepsJson: string;
  sessionStateJson: string | null;
  createdAt: string;
  updatedAt: string;
}

export function WorkflowStudio() {
  const [workflows, setWorkflows] = useState<AgnoWorkflowRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [sessionStateText, setSessionStateText] = useState("{}");

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const res = await fetch("/api/registry/workflows");
      if (res.ok) {
        setWorkflows(await res.json());
      }
    } catch (e) {
      console.error("Failed to load workflows", e);
    }
  };

  const handleOpenNewWorkflow = () => {
    setEditingId(null);
    setWorkflowName("");
    setWorkflowDescription("");
    setSteps([
      {
        id: `step-1`,
        type: "agent",
        name: "Research Step",
        targetId: "researcher",
        promptTemplate: "Gather research notes on {{input_topic}}",
      },
      {
        id: `step-2`,
        type: "agent",
        name: "Synthesis Step",
        targetId: "agent",
        promptTemplate: "Summarize research findings into a clean report",
      },
    ]);
    setSessionStateText('{\n  "input_topic": "Agno AgentOS Multi-Agent Systems"\n}');
    setIsEditing(true);
  };

  const handleAddStep = () => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      type: "agent",
      name: `Workflow Step #${steps.length + 1}`,
      targetId: "agent",
      promptTemplate: "Process output from previous step",
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const handleUpdateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleSaveWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflowName.trim()) return;

    let sessionState = {};
    try {
      sessionState = JSON.parse(sessionStateText);
    } catch {
      alert("Invalid JSON in Session State");
      return;
    }

    const payload = {
      id: editingId || `wf-${Date.now()}`,
      name: workflowName,
      description: workflowDescription,
      steps,
      sessionState,
    };

    const res = await fetch("/api/registry/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setIsEditing(false);
      await loadWorkflows();
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm("Delete this DB-driven workflow from registry?")) return;
    const res = await fetch(`/api/registry/workflows?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      await loadWorkflows();
    }
  };

  const filteredWorkflows = workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Studio Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-mono tracking-tight">Workflow Studio</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Build, edit, and step-trace DB-driven deterministic workflows and agent pipelines.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenNewWorkflow}
          className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 transition"
        >
          <Plus className="h-4 w-4" />
          Create Workflow
        </button>
      </div>

      {/* Search & Actions */}
      <div className="flex items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-1.5 text-xs outline-none focus:border-purple-500 font-sans"
          />
        </div>

        <span className="text-xs font-mono text-slate-500">
          Showing {filteredWorkflows.length} Workflows
        </span>
      </div>

      {/* WORKFLOW EDITOR / BUILDER MODAL */}
      {isEditing && (
        <form
          onSubmit={handleSaveWorkflow}
          className="rounded-2xl border border-purple-500/40 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm font-mono flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-500" />
              {editingId ? "Edit Workflow Pipeline" : "Construct New DB Workflow Pipeline"}
            </h3>
            <span className="text-[11px] font-mono text-purple-400">Persisted in `agno_workflows` table</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1">Workflow Name</label>
              <input
                type="text"
                placeholder="e.g. Content Research & Publication Pipeline"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Description</label>
              <input
                type="text"
                placeholder="Pipeline purpose and outcome"
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none"
              />
            </div>
          </div>

          {/* Sequential Step Pipeline Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Pipeline Steps ({steps.length})
              </label>
              <button
                type="button"
                onClick={handleAddStep}
                className="flex items-center gap-1 text-xs font-semibold text-purple-500 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add Step
              </button>
            </div>

            <div className="space-y-3">
              {steps.map((st, idx) => (
                <div
                  key={st.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-white font-mono text-[11px] font-bold">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={st.name}
                        onChange={(e) => handleUpdateStep(st.id, { name: e.target.value })}
                        className="font-bold text-xs bg-transparent border-b border-dashed border-slate-400 outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveStep(st.id)}
                      className="text-slate-400 hover:text-rose-500 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Step Type</label>
                      <select
                        value={st.type}
                        onChange={(e) => handleUpdateStep(st.id, { type: e.target.value as "agent" | "tool" })}
                        className="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 outline-none font-mono"
                      >
                        <option value="agent">Agent Execution Step</option>
                        <option value="tool">Standalone Tool Step</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Target Agent / Tool ID</label>
                      <input
                        type="text"
                        value={st.targetId}
                        onChange={(e) => handleUpdateStep(st.id, { targetId: e.target.value })}
                        className="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 outline-none font-mono text-cyan-400"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Prompt Template / Input</label>
                      <input
                        type="text"
                        value={st.promptTemplate || ""}
                        onChange={(e) => handleUpdateStep(st.id, { promptTemplate: e.target.value })}
                        placeholder="e.g. Execute analysis on {{previous_step_output}}"
                        className="w-full rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 outline-none font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session State JSON Editor */}
          <div className="space-y-2">
            <label className="block font-bold text-xs uppercase tracking-wider text-slate-400">
              Initial Session State (JSON)
            </label>
            <textarea
              rows={3}
              value={sessionStateText}
              onChange={(e) => setSessionStateText(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 font-mono text-xs outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-500"
            >
              Save Workflow Pipeline
            </button>
          </div>
        </form>
      )}

      {/* WORKFLOWS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredWorkflows.map((wf) => {
          let stepList: WorkflowStep[] = [];
          try {
            stepList = JSON.parse(wf.stepsJson || "[]");
          } catch {
            stepList = [];
          }

          return (
            <div
              key={wf.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 hover:border-purple-500/50 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm">{wf.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{wf.description || "No description provided."}</p>
                </div>

                <button
                  onClick={() => handleDeleteWorkflow(wf.id)}
                  title="Delete Workflow"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Step Pipeline Flow Representation */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-semibold text-slate-400 font-mono">
                  Pipeline Steps ({stepList.length}):
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {stepList.map((st, idx) => (
                    <React.Fragment key={st.id || idx}>
                      <div className="flex items-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-800/80 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1.5 shrink-0 text-xs">
                        {st.type === "agent" ? (
                          <Cpu className="h-3.5 w-3.5 text-purple-500" />
                        ) : (
                          <Wrench className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        <span className="font-mono font-medium text-purple-700 dark:text-purple-300">
                          {st.name} ({st.targetId})
                        </span>
                      </div>
                      {idx < stepList.length - 1 && (
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                <span className="flex items-center gap-1 text-[11px] text-purple-500 font-semibold">
                  <CheckCircle2 className="h-3 w-3" /> DB Workflow
                </span>
                <button className="flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                  <Play className="h-3 w-3" /> Execute Pipeline
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
