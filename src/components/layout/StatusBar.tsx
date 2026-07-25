"use client";

import React from "react";
import { useOikosStore } from "@/lib/store";
import { Database, Server, CheckCircle2 } from "lucide-react";

interface Props {
  currentTheme: "dark" | "light";
}

export function StatusBar({ currentTheme }: Props) {
  const { activeInstance } = useOikosStore();
  const isDark = currentTheme === "dark";

  return (
    <footer
      className={`h-7 border-t flex items-center justify-between px-4 font-mono text-[10px] select-none transition-colors ${
        isDark ? "border-slate-800 bg-slate-950 text-slate-400" : "border-slate-200 bg-white text-slate-700"
      }`}
    >
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
          <Database className="h-3 w-3" /> SQLite WAL Mode (data/oikos.db)
        </span>
        <span className="flex items-center gap-1.5">
          <Server className="h-3 w-3 text-slate-400" />
          AgentOS: {activeInstance?.baseUrl || "http://localhost:8000"}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-emerald-500 font-semibold">
          <CheckCircle2 className="h-3 w-3" /> Database Registry Connected
        </span>
        <span>Oikos v0.1.0</span>
      </div>
    </footer>
  );
}
