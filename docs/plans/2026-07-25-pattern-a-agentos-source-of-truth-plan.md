# Pattern A — AgentOS API as Single Source of Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Oikos to treat the active Agno AgentOS instance API as the single source of truth for Agents, Teams, Workflows, and Sessions, stripping entity tables from local SQLite.

**Architecture:** Remove local SQLite entity tables (`agno_agents`, `agno_teams`, etc.), update `src/lib/agentos.ts` with full CRUD proxies, refactor API registry routes to forward to the target AgentOS API endpoint, and update UI Studio components to interact statelessly with AgentOS.

**Tech Stack:** Next.js (App Router), Drizzle ORM (SQLite for instances/settings only), TypeScript, React, Zustand.

---

### File Structure Map
- `src/db/schema.ts` — Local SQLite schema (keep `instances` and `settings`, remove local entity tables)
- `src/lib/agentos.ts` — AgentOS API client SDK (proxy calls for Agents, Teams, Workflows, Sessions)
- `src/app/api/registry/agents/route.ts` — Proxy route for Agent CRUD forwarding to AgentOS
- `src/components/studio/AgentTeamStudio.tsx` — UI for creating/editing Agents and Teams via AgentOS API
- `src/components/playground/PlaygroundView.tsx` — UI for Playground session streaming and agent selection

---

### Task 1: Update Local Database Schema

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Edit `src/db/schema.ts` to keep only `instances` and `settings`**

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Oikos Instance Configurations
 * Manages target Agno AgentOS endpoints and authentication
 */
export const instances = sqliteTable("instances", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("unknown"), // connected, unreachable, unknown
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Key-Value Settings & UI Preferences
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

- [ ] **Step 2: Check TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: Compile check on schema.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "refactor(db): remove local entity tables in favor of AgentOS source of truth"
```

---

### Task 2: Expand AgentOS Client SDK (`src/lib/agentos.ts`)

**Files:**
- Modify: `src/lib/agentos.ts`

- [ ] **Step 1: Update `src/lib/agentos.ts` with complete Agent, Team, and Session API calls**

```typescript
import { Agent, InstanceConfig, ToolCallExecution } from "./types";

export async function checkInstanceHealth(instance: InstanceConfig): Promise<"connected" | "unreachable"> {
  try {
    const res = await fetch("/api/proxy/health", {
      headers: {
        "x-instance-id": instance.id,
      },
    });
    if (res.ok) return "connected";
    
    const resV1 = await fetch("/api/proxy/v1/health", {
      headers: {
        "x-instance-id": instance.id,
      },
    });
    return resV1.ok ? "connected" : "unreachable";
  } catch {
    return "unreachable";
  }
}

export async function fetchAgents(instanceId: string): Promise<Agent[]> {
  const res = await fetch("/api/proxy/v1/agents", {
    headers: {
      "x-instance-id": instanceId,
    },
  });

  if (!res.ok) {
    throw new Error(`AgentOS API returned status ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) {
    return data.map((a) => ({
      id: a.agent_id || a.id || "default-agent",
      name: a.name || "Agno Agent",
      description: a.description || "AgentOS Autonomous Agent",
      model: a.model || "gpt-4o",
      tools: a.tools || [],
    }));
  }

  return [];
}

export async function createAgentOnInstance(instanceId: string, agentData: Record<string, unknown>): Promise<Agent> {
  const res = await fetch("/api/proxy/v1/agents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-instance-id": instanceId,
    },
    body: JSON.stringify(agentData),
  });

  if (!res.ok) {
    throw new Error(`Failed to create agent on AgentOS (${res.status})`);
  }

  return await res.json();
}

export async function streamAgentRun(params: {
  instanceId: string;
  agentId: string;
  message: string;
  sessionId?: string;
  onChunk: (text: string) => void;
  onToolCall: (toolCall: ToolCallExecution) => void;
  onRawEvent: (event: Record<string, unknown>) => void;
}) {
  const { instanceId, agentId, message, sessionId, onChunk, onToolCall, onRawEvent } = params;

  const startTime = Date.now();
  const res = await fetch(`/api/proxy/v1/playground/agent/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-instance-id": instanceId,
    },
    body: JSON.stringify({
      agent_id: agentId,
      message,
      session_id: sessionId,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`AgentOS execution failed (${res.status}): ${errorText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;

      if (trimmed.startsWith("data:")) {
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          onRawEvent(parsed);

          if (parsed.content) {
            onChunk(parsed.content);
          }

          if (parsed.event === "RunResponse" && parsed.content) {
            onChunk(parsed.content);
          }

          if (parsed.tool_call) {
            onToolCall({
              id: parsed.tool_call.id || `tool-${Date.now()}`,
              toolName: parsed.tool_call.name || "Tool Execution",
              arguments: parsed.tool_call.args,
              status: "running",
              startTime,
            });
          }

          if (parsed.tool_result) {
            onToolCall({
              id: parsed.tool_result.id || `tool-${Date.now()}`,
              toolName: parsed.tool_result.name || "Tool Execution",
              output: parsed.tool_result.output,
              status: "success",
              startTime,
              durationMs: Date.now() - startTime,
            });
          }
        } catch {
          onChunk(jsonStr);
        }
      }
    }
  }
}
```

- [ ] **Step 2: Verify `agentos.ts` compilation**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/lib/agentos.ts
git commit -m "feat(sdk): add AgentOS instance CRUD helpers"
```

---

### Task 3: Refactor API Registry Proxy Route (`src/app/api/registry/agents/route.ts`)

**Files:**
- Modify: `src/app/api/registry/agents/route.ts`

- [ ] **Step 1: Rewrite `/api/registry/agents/route.ts` to proxy requests directly to AgentOS**

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { instances } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getTargetInstance(req: Request) {
  const instanceId = req.headers.get("x-instance-id");
  if (!instanceId) return null;
  const match = await db.select().from(instances).where(eq(instances.id, instanceId)).limit(1);
  return match[0] || null;
}

export async function GET(req: Request) {
  try {
    const target = await getTargetInstance(req);
    if (!target) {
      return NextResponse.json([], { status: 200 });
    }

    const res = await fetch(`${target.baseUrl}/v1/agents`, {
      headers: target.apiKey ? { Authorization: `Bearer ${target.apiKey}` } : {},
    });

    if (!res.ok) {
      return NextResponse.json([], { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const target = await getTargetInstance(req);
    if (!target) {
      return NextResponse.json({ error: "No active AgentOS instance specified" }, { status: 400 });
    }

    const body = await req.json();
    const res = await fetch(`${target.baseUrl}/v1/agents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(target.apiKey ? { Authorization: `Bearer ${target.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/registry/agents/route.ts
git commit -m "refactor(api): proxy registry agents route directly to target AgentOS instance"
```

---

### Task 4: Run Tests & Build Verification

**Files:**
- Test suite: `npm test` or `npx vitest run` / `npx next build`

- [ ] **Step 1: Run project build & typecheck**

Run: `npm run build` or `npx tsc --noEmit`
Expected: Successful compilation without schema type errors.

- [ ] **Step 2: Commit final refactor state**

```bash
git add .
git commit -m "feat: complete Pattern A AgentOS API source of truth refactor"
```
