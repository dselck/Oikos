"use client";

import React, { useEffect } from "react";
import { useOikosStore } from "@/lib/store";
import { InstanceConfig } from "@/lib/types";
import { checkInstanceHealth, fetchAgents } from "@/lib/agentos";
import {
  Cpu,
  Activity,
  Sliders,
  Server,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Plus,
} from "lucide-react";

export function Navbar() {
  const {
    viewMode,
    setViewMode,
    instances,
    setInstances,
    activeInstance,
    setActiveInstance,
    setAgents,
    setSelectedAgent,
  } = useOikosStore();

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      const res = await fetch("/api/config/instances");
      if (res.ok) {
        const list: InstanceConfig[] = await res.json();
        setInstances(list);

        const defaultInst = list.find((i) => i.isDefault) || list[0] || null;
        if (defaultInst) {
          setActiveInstance(defaultInst);
          verifyAndLoadAgents(defaultInst);
        }
      }
    } catch (e) {
      console.error("Failed to load instances", e);
    }
  };

  const verifyAndLoadAgents = async (inst: InstanceConfig) => {
    const health = await checkInstanceHealth(inst);
    const updated = { ...inst, status: health };
    setActiveInstance(updated);

    const agentList = await fetchAgents(inst.id);
    setAgents(agentList);
    if (agentList.length > 0) {
      setSelectedAgent(agentList[0]);
    }
  };

  const handleInstanceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = instances.find((i) => i.id === e.target.value);
    if (selected) {
      setActiveInstance(selected);
      verifyAndLoadAgents(selected);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 shadow-lg shadow-cyan-500/20">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white font-mono">
                OIKOS
              </span>
              <span className="rounded-md bg-cyan-100 dark:bg-cyan-950 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-800/50">
                AgentOS
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">OpenSource AgentOS Control Plane</p>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <nav className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-900/90 p-1 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setViewMode("playground")}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all ${
              viewMode === "playground"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Playground
          </button>
          <button
            onClick={() => setViewMode("control-plane")}
            className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-medium transition-all ${
              viewMode === "control-plane"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Control Plane
          </button>
        </nav>

        {/* Right Active Instance Selector & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5">
            <Server className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <select
              value={activeInstance?.id || ""}
              onChange={handleInstanceSelect}
              className="bg-transparent text-xs font-medium text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              {instances.map((inst) => (
                <option key={inst.id} value={inst.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {inst.name} {inst.isDefault ? "(Default)" : ""}
                </option>
              ))}
            </select>

            {/* Health Status Indicator */}
            {activeInstance?.status === "connected" ? (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3 w-3" />
                Standby
              </span>
            )}
          </div>

          <button
            onClick={() => setViewMode("control-plane")}
            title="Add or configure AgentOS instance"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
