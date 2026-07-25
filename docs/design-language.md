# Oikos Design Language & Visual System

This document defines the official design system, typography, color semantics, surface materials, and layout standards for **Oikos**, validated via interactive prototyping.

---

## 🏛️ Visual Philosophy & Approved Layout (Variant C: IDE 3-Pane Control Center)

Oikos embodies a **refined, enterprise-grade IDE Control Center** (inspired by VS Code, Cursor, and Vercel) featuring a **3-Pane Split View**:

1. **Left Activity Bar (`w-14`)**: Narrow vertical navigation housing icon buttons for all 6 Studios (Playground, Agent & Team Studio, Workflow Studio, Knowledge & RAG, Sessions & Memory, Control Plane).
2. **Center Primary Workspace Canvas**: High-density workspace area for authoring agents/teams/workflows, interacting in the Playground, or managing RAG document stores.
3. **Right Persistent Trace & Telemetry Stream (`w-80`)**: Dedicated side panel displaying real-time SSE stream events, tool execution payloads, token counts, and latency metrics.
4. **Bottom Monospaced Status Bar (`h-7`)**: System status bar showing active AgentOS connection URL, SQLite WAL database status, and streaming health.

---

## 🎨 Dual Theme System (Dark Lead + First-Class Light Mode)

Oikos supports seamless switching between **Dark Mode (Default Lead)** and **Light Mode (First-Class)** via CSS custom properties and Tailwind `dark` class bindings.

### 1. Dark Mode (Default Lead)
* **App Canvas**: `slate-950` (`#020617`) — Deep professional slate canvas.
* **Surface Cards / Panels**: `slate-900/90` (`#0f172a`) with subtle borders `border-slate-800`.
* **Primary Text**: `slate-100` (`#f8fafc`).
* **Secondary Text**: `slate-400` (`#94a3b8`).
* **Brand Accents**:
  - *Primary Action / Runtime*: Refined Indigo (`#6366f1` / `indigo-500`) & Cool Cyan (`#06b6d4`).
  - *Success*: Emerald (`#10b981`).
  - *Warning/Tool Execution*: Amber (`#f59e0b`).
  - *Telemetry/Traces*: Slate Violet (`#8b5cf6`).

### 2. Light Mode (First-Class)
* **App Canvas**: `slate-50` (`#f8fafc`) / Pure White (`#ffffff`).
* **Surface Cards / Panels**: Pure White (`#ffffff`) with crisp borders `border-slate-200` (`#e2e8f0`) and subtle shadows (`shadow-sm`).
* **Primary Text**: `slate-900` (`#0f172a`).
* **Secondary Text**: `slate-600` (`#475569`).
* **Brand Accents**:
  - *Primary Action / Runtime*: Royal Indigo (`#4f46e5` / `indigo-600`) & Deep Blue (`#2563eb`).
  - *Success*: Dark Emerald (`#059669`).
  - *Warning/Tool Execution*: Dark Amber (`#d97706`).
  - *Telemetry/Traces*: Deep Violet (`#7c3aed`).

---

## 🔤 Typography & Font Hierarchy

* **Primary Body & UI Font**: `Inter` (sans-serif) — Crisp, professional typography with optimized kerning and weights (Regular, Medium, Semibold, Bold).
* **Code & Monospace Font**: `JetBrains Mono` (monospace) — For agent IDs, tool call signatures, JSON traces, Python code snippets, and execution telemetry.
