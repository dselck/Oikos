"use client";

import React from "react";
import { useOikosStore } from "@/lib/store";
import { ViewMode } from "@/lib/types";
import { Cpu, Activity, Sliders, Layers, FileText, History, Sun, Moon } from "lucide-react";

interface Props {
  currentTheme: "dark" | "light";
  onToggleTheme: () => void;
}

export function ActivityBar({ currentTheme, onToggleTheme }: Props) {
  const { viewMode, setViewMode } = useOikosStore();

  const isDark = currentTheme === "dark";

  const studios: { id: ViewMode; title: string; icon: React.ElementType }[] = [
    { id: "playground", title: "Playground", icon: Activity },
    { id: "agents", title: "Agent & Team Studio", icon: Cpu },
    { id: "workflows", title: "Workflow Studio", icon: Layers },
    { id: "documents", title: "Knowledge & RAG", icon: FileText },
    { id: "sessions", title: "Sessions & Memory", icon: History },
    { id: "control-plane", title: "Control Plane", icon: Sliders },
  ];

  return (
    <aside
      className={`w-14 border-r flex flex-col items-center justify-between py-4 shrink-0 transition-colors ${
        isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-col items-center space-y-4 w-full">
        {/* Brand Icon */}
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-mono font-bold text-white shadow-sm text-xs">
          OI
        </div>

        {/* Studio Icon Buttons */}
        <div className="flex flex-col items-center space-y-2 w-full px-2">
          {studios.map((item, idx) => {
            const Icon = item.icon;
            const isActive = viewMode === item.id;
            return (
              <button
                key={`${item.id}-${idx}`}
                onClick={() => setViewMode(item.id as ViewMode)}
                title={item.title}
                className={`p-2.5 rounded-xl transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow"
                    : isDark
                    ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme Switcher Button */}
      <button
        onClick={onToggleTheme}
        title={`Switch to ${isDark ? "Light Mode" : "Dark Lead Mode"}`}
        className={`p-2.5 rounded-xl transition ${
          isDark
            ? "text-amber-400 hover:bg-slate-800"
            : "text-indigo-600 hover:bg-slate-100"
        }`}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </aside>
  );
}
