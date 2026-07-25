# Code Review & AgentOS State Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remediate all 8 code review findings across Standards and Spec/Architecture axes, remove demo mock fallbacks in favor of true AgentOS state, and standardize ubiquitous language per `CONTEXT.md`.

**Architecture:** Create an explicit API route helper for DB handling, pipe proxy streams directly, remove synthetic fallback mocks, decompose Zustand store transient vs entity slices, extract shared SSE streaming logic into `useAgentStream`, and update non-canonical UI terms.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Zustand, Drizzle ORM, Vitest.

---

### Task 1: API Route Validation, Stream Proxying & Error Handling

**Files:**
- Modify: `src/app/api/proxy/[...path]/route.ts`
- Modify: `src/app/api/registry/agents/route.ts`
- Modify: `src/app/api/registry/workflows/route.ts`
- Modify: `src/app/api/registry/teams/route.ts`
- Modify: `src/app/api/registry/knowledge/route.ts`
- Modify: `src/app/api/registry/sessions/route.ts`

- [ ] **Step 1: Fix proxy stream piping and error detail propagation**

In `src/app/api/proxy/[...path]/route.ts`:
1. Check `params?.path` safety before calling `.join("/")`.
2. Stream request body using `req.body` (TransformStream or ReadableStream) instead of buffering full payload via `req.arrayBuffer()`.
3. Propagate upstream AgentOS HTTP status and error body rather than returning generic 504 on errors.

- [ ] **Step 2: Fix unvalidated PUT payloads and array out-of-bounds in registry routes**

In `src/app/api/registry/agents/route.ts`:
1. Check existing record before updating.
2. Verify `updated.length > 0` before returning `updated[0]`. Return `404 Not Found` if record does not exist.
3. Validate partial `PUT` fields so missing properties do not overwrite existing DB values with `undefined`.

Apply similar checks to `workflows/route.ts`, `teams/route.ts`, `knowledge/route.ts`, `sessions/route.ts`.

- [ ] **Step 3: Test API routes**

Run: `npx vitest run`
Expected: PASS

---

### Task 2: Standardized Registry Route Helper & Purge Synchronous Seed Side-Effects

**Files:**
- Create: `src/app/api/registry/helpers.ts`
- Modify: `src/db/index.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Define domain constants in `src/lib/types.ts`**

Define provider and model constants to eliminate magic strings:
```typescript
export const MODEL_PROVIDERS = {
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  GROQ: "groq",
  OLLAMA: "ollama",
} as const;

export const DEFAULT_MODELS = {
  OPENAI: "gpt-4o",
  ANTHROPIC: "claude-3-5-sonnet",
} as const;

export const EXECUTION_MODES = {
  HIERARCHICAL: "hierarchical",
  PARALLEL: "parallel",
  SEQUENTIAL: "sequential",
} as const;
```

- [ ] **Step 2: Remove hardcoded seed data and synchronous import side-effects in `src/db/index.ts`**

1. Remove demo seeds ("General Agent", "Deep Researcher", "Research & Synthesis Team") from `initDatabase()`.
2. Keep schema migration check clean and idempotent.
3. Ensure `initDatabase()` is called lazily upon first query execution rather than synchronously during module evaluation.

- [ ] **Step 3: Create shared registry route wrapper in `src/app/api/registry/helpers.ts`**

Extract standard error handling, DB initialization, and timestamp handling into a clean higher-order wrapper `handleRegistryRequest`.

---

### Task 3: Strip Out Demo/Mock Fallbacks & Enforce AgentOS Live State

**Files:**
- Modify: `src/lib/agentos.ts`
- Modify: `src/components/studio/AgentTeamStudio.tsx`
- Modify: `src/components/playground/PlaygroundView.tsx`

- [ ] **Step 1: Remove `getFallbackAgents()` and `simulateAgentResponse()` from `src/lib/agentos.ts`**

1. Delete `getFallbackAgents()` and `simulateAgentResponse()`.
2. Update `fetchAgents(instanceId)` to return an empty array `[]` or throw when AgentOS returns an error/unreachable status, letting UI present an empty state ("No AgentOS agents found or instance offline").
3. Update `streamAgentRun` to throw an error when stream connection fails instead of falling back to simulated text chunks.

- [ ] **Step 2: Update UI components for live empty state handling**

In `AgentTeamStudio.tsx` and `PlaygroundView.tsx`, display clear offline/empty state cards when no live agents exist or instance is disconnected.

---

### Task 4: Store Slice Decoupling & Shared SSE Streaming Hook

**Files:**
- Modify: `src/lib/store.ts`
- Create: `src/hooks/useAgentStream.ts`
- Modify: `src/components/playground/PlaygroundView.tsx`
- Modify: `src/components/studio/WorkflowStudio.tsx`

- [ ] **Step 1: Fix bounds safety and decouple store state in `src/lib/store.ts`**

1. Fix `updateLastMessage`:
```typescript
updateLastMessage: (content, toolCalls) =>
  set((state) => {
    if (state.messages.length === 0) return state;
    const updated = [...state.messages];
    const last = { ...updated[updated.length - 1] };
    last.content = content;
    if (toolCalls) last.toolCalls = toolCalls;
    updated[updated.length - 1] = last;
    return { messages: updated };
  }),
```
2. Separate transient UI state actions from persistent entity state selectors to avoid global re-render cascades.

- [ ] **Step 2: Create `useAgentStream` hook in `src/hooks/useAgentStream.ts`**

Extract shared SSE parsing, chunk buffering, tool call tree management, and raw event logging into a single hook reused by both `PlaygroundView` and `WorkflowStudio`.

- [ ] **Step 3: Refactor `PlaygroundView.tsx` and `WorkflowStudio.tsx` to use `useAgentStream`**

---

### Task 5: Ubiquitous Language Alignment per `CONTEXT.md`

**Files:**
- Modify: `src/components/studio/KnowledgeStudio.tsx`
- Modify: `src/components/playground/TraceInspector.tsx`
- Modify: `test/theme-light-mode.test.tsx`

- [ ] **Step 1: Standardize terminology in `KnowledgeStudio.tsx`**

Replace "Vector Store" with "Knowledge Base (RAG)" and "Document Folder" with "Document Collection".

- [ ] **Step 2: Standardize terminology in `TraceInspector.tsx`**

Replace "Log viewer" / "Trace drawer" with "Trace Inspector".

- [ ] **Step 3: Run Vitest & verify all tests pass**

Run: `npx vitest run`
Expected: 100% PASS with clean output.
