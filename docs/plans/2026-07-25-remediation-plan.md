# Remediation Plan: Oikos Architectural, Domain & Navigation Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve navigation defects (un-orphan ControlPlaneView), align codebase terminology strictly with `CONTEXT.md` ubiquitous language, wire DB-driven registry persistence for Workflow and Knowledge studios (ADR 0004), and decompose monolithic studio components.

**Architecture:** Extend `ViewMode` typing to separate Agent/Team Studio from Control Plane, purge non-standard terms (`Bot`, `Assistant`, `Pipeline`, `Vector Store`, `Trace Drawer`), hydrate studios from `/api/registry/*` endpoints, and extract focused sub-components.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide React, Zustand, SQLite / Drizzle ORM.

---

### Task 1: Fix Navigation Routing Defect & Un-orphan ControlPlaneView

**Files:**
- Modify: `src/lib/types.ts:63`
- Modify: `src/components/layout/ActivityBar.tsx:18-25`
- Modify: `src/components/layout/MainLayout.tsx:34-39`

- [ ] **Step 1: Update `ViewMode` type definition in `src/lib/types.ts`**

Update `ViewMode` union type to include `"agents"`:
```typescript
export type ViewMode = "playground" | "agents" | "control-plane" | "workflows" | "documents" | "sessions";
```

- [ ] **Step 2: Update `ActivityBar.tsx` studio mapping**

In `src/components/layout/ActivityBar.tsx`, change `Bot` icon to `Cpu` and set `id` for "Agent & Team Studio" to `"agents"`:
```typescript
import { Cpu, Activity, Sliders, Layers, FileText, History, Sun, Moon } from "lucide-react";

const studios: { id: ViewMode; title: string; icon: React.ElementType }[] = [
  { id: "playground", title: "Playground", icon: Activity },
  { id: "agents", title: "Agent & Team Studio", icon: Cpu },
  { id: "workflows", title: "Workflow Studio", icon: Layers },
  { id: "documents", title: "Knowledge & RAG", icon: FileText },
  { id: "sessions", title: "Sessions & Memory", icon: History },
  { id: "control-plane", title: "Control Plane", icon: Sliders },
];
```

- [ ] **Step 3: Update `MainLayout.tsx` conditional view rendering**

In `src/components/layout/MainLayout.tsx`, render `AgentTeamStudio` for `"agents"` and `ControlPlaneView` for `"control-plane"`:
```typescript
<main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
  {viewMode === "playground" && <PlaygroundView />}
  {viewMode === "agents" && <AgentTeamStudio />}
  {viewMode === "control-plane" && <ControlPlaneView />}
  {viewMode === "workflows" && <WorkflowStudio />}
  {viewMode === "sessions" && <SessionsMemoryStudio />}
  {viewMode === "documents" && <KnowledgeStudio />}
</main>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Successful build with zero TypeScript errors.

- [ ] **Step 5: Commit changes**

```bash
git add src/lib/types.ts src/components/layout/ActivityBar.tsx src/components/layout/MainLayout.tsx
git commit -m "fix(nav): un-orphan ControlPlaneView by separating agents and control-plane view modes"
```

---

### Task 2: Purge Non-Standard Terminology (`CONTEXT.md` Alignment)

**Files:**
- Modify: `src/components/layout/Navbar.tsx`
- Modify: `src/components/control-plane/ControlPlaneView.tsx`
- Modify: `src/components/playground/PlaygroundView.tsx`
- Modify: `src/components/playground/TraceInspector.tsx`
- Modify: `src/components/studio/AgentTeamStudio.tsx`
- Modify: `src/components/studio/SessionsMemoryStudio.tsx`
- Modify: `src/components/studio/WorkflowStudio.tsx`
- Modify: `src/components/studio/KnowledgeStudio.tsx`
- Modify: `src/lib/agentos.ts`
- Modify: `src/lib/store.ts`
- Modify: `src/db/index.ts`

- [ ] **Step 1: Replace `Bot` icon imports with `Cpu`, `Brain`, or `Users`**

Replace `Bot` icon imports from `lucide-react` across:
- `src/components/layout/Navbar.tsx`
- `src/components/control-plane/ControlPlaneView.tsx`
- `src/components/playground/PlaygroundView.tsx`
- `src/components/studio/AgentTeamStudio.tsx`
- `src/components/studio/SessionsMemoryStudio.tsx`
- `src/components/studio/WorkflowStudio.tsx`

- [ ] **Step 2: Rename `"assistant"` / `"General Assistant"` default names to `"agent"` / `"General Agent"`**

Update default role/name strings:
- `src/components/playground/PlaygroundView.tsx`: Default target agent string `"assistant"` -> `"agent"`.
- `src/components/studio/WorkflowStudio.tsx`: Default step target `"assistant"` -> `"agent"`.
- `src/lib/agentos.ts`: Default fallback agent name `"General Assistant"` -> `"General Agent"`.
- `src/db/index.ts`: Seed default agent name `"General Assistant"` -> `"General Agent"`.

- [ ] **Step 3: Replace `"Pipeline"` with `"Workflow"`**

Update UI labels:
- `src/components/studio/WorkflowStudio.tsx`: Change `"Pipeline Step"` -> `"Workflow Step"`, `"Execute Pipeline"` -> `"Execute Workflow"`.
- `src/components/studio/AgentTeamStudio.tsx`: Change `"Sequential Pipeline"` -> `"Sequential Workflow"`.

- [ ] **Step 4: Replace `"Vector Store"` with `"Knowledge Base (RAG)"`**

Update UI labels:
- `src/components/studio/KnowledgeStudio.tsx`: Change `"Vector Store Integration"` -> `"Knowledge Base Integration"`.

- [ ] **Step 5: Replace `"Trace Drawer"` with `"Trace Inspector slide-over panel"`**

Update comments and text labels:
- `src/components/playground/PlaygroundView.tsx`
- `src/components/playground/TraceInspector.tsx`
- `src/lib/agentos.ts`
- `src/lib/store.ts`

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 7: Commit changes**

```bash
git add src/
git commit -m "style(domain): standardize ubiquitous language per CONTEXT.md"
```

---

### Task 3: Hydrate Workflow & Knowledge Studios from DB-Driven Registry (ADR 0004)

**Files:**
- Modify: `src/components/studio/WorkflowStudio.tsx`
- Modify: `src/components/studio/KnowledgeStudio.tsx`

- [ ] **Step 1: Connect `WorkflowStudio.tsx` to `/api/registry/workflows`**

Fetch existing workflows on mount via `useEffect` calling `GET /api/registry/workflows`. On save/create step, `POST` to `/api/registry/workflows` to persist the definition to SQLite.

- [ ] **Step 2: Connect `KnowledgeStudio.tsx` to `/api/registry/knowledge`**

Fetch existing knowledge base indexes on mount via `useEffect` calling `GET /api/registry/knowledge`. On index creation, `POST` to `/api/registry/knowledge` to persist definition to SQLite.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 4: Commit changes**

```bash
git add src/components/studio/WorkflowStudio.tsx src/components/studio/KnowledgeStudio.tsx
git commit -m "feat(registry): hydrate WorkflowStudio and KnowledgeStudio from DB registry endpoints"
```

---

### Task 4: Decompose Monolithic `AgentTeamStudio.tsx` & Consolidate Theme State

**Files:**
- Create: `src/components/studio/AgentCardGrid.tsx`
- Create: `src/components/studio/TeamBuilderForm.tsx`
- Modify: `src/components/studio/AgentTeamStudio.tsx`
- Modify: `src/lib/store.ts`
- Modify: `src/components/layout/MainLayout.tsx`

- [ ] **Step 1: Extract `<AgentCardGrid />` component**

Move agent card rendering, filtering, and status badges into `src/components/studio/AgentCardGrid.tsx`.

- [ ] **Step 2: Extract `<TeamBuilderForm />` component**

Move team creation form and member agent selection into `src/components/studio/TeamBuilderForm.tsx`.

- [ ] **Step 3: Simplify `AgentTeamStudio.tsx`**

Refactor `AgentTeamStudio.tsx` to compose `<AgentCardGrid />` and `<TeamBuilderForm />`.

- [ ] **Step 4: Consolidate theme state management into store**

Add `theme: "dark" | "light"` and `toggleTheme: () => void` to Zustand `useOikosStore` in `src/lib/store.ts`. Update `MainLayout.tsx` and `ActivityBar.tsx` to use store theme state instead of duplicate local React state.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Successful build.

- [ ] **Step 6: Commit changes**

```bash
git add src/
git commit -m "refactor(studio): decompose AgentTeamStudio and consolidate theme state in Zustand store"
```
