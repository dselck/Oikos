"use client";

import React, { useState } from "react";
import { Users } from "lucide-react";
import { Agent } from "@/lib/types";

interface Props {
  agentsList: Agent[];
  onSaveTeam: (teamData: {
    name: string;
    description: string;
    leaderAgentId: string;
    memberAgentIds: string[];
    executionMode: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function TeamBuilderForm({ agentsList, onSaveTeam, onCancel }: Props) {
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [leaderAgentId, setLeaderAgentId] = useState(agentsList[0]?.id || "");
  const [memberAgentIds, setMemberAgentIds] = useState<string[]>([]);
  const [executionMode, setExecutionMode] = useState("hierarchical");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !leaderAgentId) return;

    await onSaveTeam({
      name: teamName,
      description: teamDescription,
      leaderAgentId,
      memberAgentIds,
      executionMode,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-purple-500/40 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
    >
      <h3 className="font-bold text-sm font-mono flex items-center gap-2">
        <Users className="h-4 w-4 text-purple-500" />
        Create Multi-Agent Team
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-semibold mb-1">Team Name</label>
          <input
            type="text"
            placeholder="e.g. Research & Synthesis Team"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Leader Agent</label>
          <select
            value={leaderAgentId}
            onChange={(e) => setLeaderAgentId(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none font-mono"
          >
            {agentsList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.modelName || a.model || "gpt-4o"})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-1">Execution Mode</label>
          <select
            value={executionMode}
            onChange={(e) => setExecutionMode(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 outline-none font-mono"
          >
            <option value="hierarchical">Hierarchical (Leader Delegates)</option>
            <option value="autonomous">Autonomous</option>
            <option value="sequential">Sequential Workflow</option>
            <option value="round_robin">Round Robin</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-500"
        >
          Save Team to Database
        </button>
      </div>
    </form>
  );
}
