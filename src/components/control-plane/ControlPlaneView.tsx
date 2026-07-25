"use client";

import React, { useState } from "react";
import { useOikosStore } from "@/lib/store";
import { InstanceConfig } from "@/lib/types";
import { checkInstanceHealth } from "@/lib/agentos";
import {
  Server,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Key,
  Globe,
  Sliders,
  ShieldCheck,
  RefreshCw,
  Cpu,
  Wrench,
} from "lucide-react";

export function ControlPlaneView() {
  const { instances, setInstances, activeInstance, setActiveInstance, agents } = useOikosStore();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:8000");
  const [apiKey, setApiKey] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  const reloadInstances = async () => {
    try {
      const res = await fetch("/api/config/instances");
      if (res.ok) {
        const list = await res.json();
        setInstances(list);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !baseUrl.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/config/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, baseUrl, apiKey, isDefault }),
      });

      if (res.ok) {
        const newInst: InstanceConfig = await res.json();
        setName("");
        setBaseUrl("http://localhost:8000");
        setApiKey("");
        setIsDefault(false);
        setIsAdding(false);
        await reloadInstances();
        setActiveInstance(newInst);
      }
    } catch (err) {
      alert("Failed to save instance: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this AgentOS instance configuration?")) return;
    try {
      const res = await fetch(`/api/config/instances?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await reloadInstances();
        if (activeInstance?.id === id) {
          setActiveInstance(instances.find((i) => i.id !== id) || null);
        }
      }
    } catch (err) {
      alert("Failed to delete instance: " + String(err));
    }
  };

  const handleTestHealth = async (inst: InstanceConfig) => {
    const health = await checkInstanceHealth(inst);
    const updated = instances.map((i) => (i.id === inst.id ? { ...i, status: health } : i));
    setInstances(updated);
    if (activeInstance?.id === inst.id) {
      setActiveInstance({ ...inst, status: health });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans min-h-[calc(100vh-4rem)] transition-colors">
      {/* Control Plane Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Oikos Control Plane</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage Agno AgentOS instance configurations, connection credentials, and telemetry settings.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:brightness-110 transition"
        >
          <Plus className="h-4 w-4" />
          Add AgentOS Instance
        </button>
      </div>

      {/* Add Instance Form Modal / Accordion */}
      {isAdding && (
        <form
          onSubmit={handleAddInstance}
          className="rounded-2xl border border-indigo-500/30 bg-slate-900/90 p-6 shadow-2xl space-y-4 backdrop-blur-xl"
        >
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-400" />
            Configure New AgentOS Instance
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Instance Name</label>
              <input
                type="text"
                placeholder="e.g. Local Production AgentOS"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Base Endpoint URL</label>
              <input
                type="url"
                placeholder="http://localhost:8000"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                required
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">API Key (Optional)</label>
              <input
                type="password"
                placeholder="Agno bearer / API token"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
              />
              <label htmlFor="isDefault" className="text-xs text-slate-300 font-medium">
                Set as default startup instance
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Connection"}
            </button>
          </div>
        </form>
      )}

      {/* Configured Instances Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Server className="h-4 w-4 text-cyan-400" />
          Configured AgentOS Instances ({instances.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {instances.map((inst) => (
            <div
              key={inst.id}
              className={`rounded-2xl border p-5 transition-all ${
                activeInstance?.id === inst.id
                  ? "border-cyan-500/50 bg-slate-900/90 shadow-xl shadow-cyan-500/5"
                  : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">{inst.name}</h3>
                    {inst.isDefault && (
                      <span className="rounded bg-indigo-950 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-800">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-xs text-cyan-400 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-slate-500" />
                    {inst.baseUrl}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestHealth(inst)}
                    title="Ping Connection"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(inst.id)}
                    title="Delete Config"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5">
                  {inst.status === "connected" ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                      <AlertCircle className="h-3.5 w-3.5" /> Standby
                    </span>
                  )}
                </div>

                {inst.apiKey ? (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Key className="h-3 w-3 text-amber-400" /> Auth Token Set
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <ShieldCheck className="h-3 w-3 text-slate-600" /> Public / No Key
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discovered Agents Overview */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Cpu className="h-4 w-4 text-indigo-400" />
          Discovered Agents ({agents.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agents.map((ag) => (
            <div key={ag.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">{ag.name}</span>
                <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                  {ag.model || "Agno"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">{ag.description}</p>
              <div className="pt-2 flex items-center gap-1 text-[10px] text-slate-500">
                <Wrench className="h-3 w-3 text-slate-400" />
                <span>Tools: {ag.tools?.join(", ") || "None"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Telemetry & ADR Status */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Cpu className="h-4 w-4 text-cyan-400" />
          System Architecture Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase">Storage Engine</span>
            <p className="font-mono text-cyan-400 font-semibold mt-1">SQLite + Drizzle ORM</p>
            <p className="text-[10px] text-slate-500">data/oikos.db</p>
          </div>
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase">Full-Stack Framework</span>
            <p className="font-mono text-indigo-400 font-semibold mt-1">Next.js 19 App Router</p>
            <p className="text-[10px] text-slate-500">Route Handlers & SSE Proxy</p>
          </div>
          <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
            <span className="text-slate-500 text-[10px] uppercase">Architecture Records</span>
            <p className="font-mono text-emerald-400 font-semibold mt-1">ADR-0001, 0002, 0003</p>
            <p className="text-[10px] text-slate-500">docs/adr/</p>
          </div>
        </div>
      </div>
    </div>
  );
}
