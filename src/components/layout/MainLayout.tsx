"use client";

import React, { useState } from "react";
import { ActivityBar } from "./ActivityBar";
import { TraceStreamPane } from "./TraceStreamPane";
import { StatusBar } from "./StatusBar";
import { PlaygroundView } from "@/components/playground/PlaygroundView";
import { AgentTeamStudio } from "@/components/studio/AgentTeamStudio";
import { WorkflowStudio } from "@/components/studio/WorkflowStudio";
import { SessionsMemoryStudio } from "@/components/studio/SessionsMemoryStudio";
import { KnowledgeStudio } from "@/components/studio/KnowledgeStudio";
import { ControlPlaneView } from "@/components/control-plane/ControlPlaneView";
import { useOikosStore } from "@/lib/store";

export function MainLayout() {
  const { viewMode } = useOikosStore();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isDark = theme === "dark";

  return (
    <div className={`flex flex-col h-screen font-sans ${isDark ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* 3-Pane Body Area */}
      <div className="flex flex-1 min-h-0">
        {/* Pane 1: Left Activity Bar */}
        <ActivityBar currentTheme={theme} onToggleTheme={toggleTheme} />

        {/* Pane 2: Center Main Viewport Canvas */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {viewMode === "playground" && <PlaygroundView />}
          {viewMode === "agents" && <AgentTeamStudio />}
          {viewMode === "control-plane" && <ControlPlaneView />}
          {viewMode === "workflows" && <WorkflowStudio />}
          {viewMode === "sessions" && <SessionsMemoryStudio />}
          {viewMode === "documents" && <KnowledgeStudio />}
        </main>

        {/* Pane 3: Right Persistent Trace Stream Inspector */}
        <TraceStreamPane currentTheme={theme} />
      </div>

      {/* Bottom Monospaced Status Bar */}
      <StatusBar currentTheme={theme} />
    </div>
  );
}
